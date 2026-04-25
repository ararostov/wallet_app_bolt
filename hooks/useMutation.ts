// Generic mutation hook: idempotency key + retry on 429/5xx + cache invalidation.
// API surface mirrors docs/mobile/infrastructure.ru.md §8.2.

import { useCallback, useRef, useState } from 'react';

import { invalidateQueries } from './useQuery';
import { ApiError } from '@/utils/errors';
import { newIdempotencyKey } from '@/utils/idempotency';
import { logError } from '@/utils/logger';

export type MutationFn<TVars, TResult> = (
  vars: TVars,
  opts: { idempotencyKey: string },
) => Promise<TResult>;

export type MutationOptions<TVars, TResult> = {
  retry?: number;
  retryBaseDelayMs?: number;
  onSuccess?: (result: TResult, vars: TVars) => void;
  onError?: (error: Error, vars: TVars) => void;
  invalidateKeys?: string[];
};

export type MutationState<TResult> = {
  loading: boolean;
  error: Error | null;
  data: TResult | undefined;
};

export type MutationResult<TVars, TResult> = MutationState<TResult> & {
  mutate: (vars: TVars) => Promise<TResult>;
  reset: () => void;
};

const DEFAULT_RETRY = 3;
const DEFAULT_BASE_DELAY = 1000;

export function useMutation<TVars, TResult>(
  fn: MutationFn<TVars, TResult>,
  options: MutationOptions<TVars, TResult> = {},
): MutationResult<TVars, TResult> {
  const {
    retry = DEFAULT_RETRY,
    retryBaseDelayMs = DEFAULT_BASE_DELAY,
    onSuccess,
    onError,
    invalidateKeys,
  } = options;

  const [state, setState] = useState<MutationState<TResult>>({
    loading: false,
    error: null,
    data: undefined,
  });

  const idempotencyKeyRef = useRef<string>(newIdempotencyKey());
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const mutate = useCallback(
    async (vars: TVars): Promise<TResult> => {
      setState({ loading: true, error: null, data: undefined });
      const idempotencyKey = idempotencyKeyRef.current;

      let attempt = 0;
      let lastError: unknown;
      while (attempt < retry) {
        try {
          const result = await fnRef.current(vars, { idempotencyKey });
          setState({ loading: false, error: null, data: result });
          if (invalidateKeys && invalidateKeys.length > 0) {
            invalidateQueries(invalidateKeys);
          }
          // After success the logical operation is done — rotate the key
          // so the next mutate call doesn't replay the same one.
          idempotencyKeyRef.current = newIdempotencyKey();
          onSuccess?.(result, vars);
          return result;
        } catch (e) {
          lastError = e;
          const retriable =
            e instanceof ApiError && [429, 502, 503, 504].includes(e.status);
          if (!retriable || attempt === retry - 1) break;
          await new Promise((resolve) =>
            setTimeout(resolve, retryBaseDelayMs * 2 ** attempt),
          );
          attempt += 1;
        }
      }

      const error =
        lastError instanceof Error ? lastError : new Error(String(lastError));
      logError(error, { where: 'useMutation' });
      setState({ loading: false, error, data: undefined });
      onError?.(error, vars);
      throw error;
    },
    [retry, retryBaseDelayMs, onSuccess, onError, invalidateKeys],
  );

  const reset = useCallback(() => {
    idempotencyKeyRef.current = newIdempotencyKey();
    setState({ loading: false, error: null, data: undefined });
  }, []);

  return { ...state, mutate, reset };
}
