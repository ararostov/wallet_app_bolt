// useInitiateTopup — POST /wallet/topup.
//
// Idempotency-Key is owned by the calling screen (review.tsx) so it can be
// rotated when amount or paymentMethodId changes and reused on retry. This
// hook is a thin wrapper that exposes the mutation surface used elsewhere
// (loading / error / data / mutate / reset) but keeps key control external.

import { useCallback, useRef, useState } from 'react';

import type {
  InitiateTopupRequest,
  TopupInitiationResponse,
} from '@/types/topup';
import { ApiError } from '@/utils/errors';
import { logError } from '@/utils/logger';
import { topupApi } from '@/utils/api/topup';

export interface InitiateTopupVars {
  payload: InitiateTopupRequest;
  idempotencyKey: string;
}

export interface UseInitiateTopupResult {
  loading: boolean;
  error: Error | null;
  data: TopupInitiationResponse | undefined;
  mutate: (vars: InitiateTopupVars) => Promise<TopupInitiationResponse>;
  reset: () => void;
}

const RETRIABLE_STATUSES = [502, 503, 504];
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

export function useInitiateTopup(): UseInitiateTopupResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TopupInitiationResponse | undefined>(
    undefined,
  );
  const inFlight = useRef<Promise<TopupInitiationResponse> | null>(null);

  const mutate = useCallback(
    async (vars: InitiateTopupVars): Promise<TopupInitiationResponse> => {
      if (inFlight.current) {
        return inFlight.current;
      }
      setLoading(true);
      setError(null);

      const run = (async (): Promise<TopupInitiationResponse> => {
        let attempt = 0;
        let lastError: unknown;
        while (attempt <= MAX_RETRIES) {
          try {
            const result = await topupApi.initiate(
              vars.payload,
              vars.idempotencyKey,
            );
            setData(result);
            setLoading(false);
            return result;
          } catch (e) {
            lastError = e;
            const retriable =
              e instanceof ApiError && RETRIABLE_STATUSES.includes(e.status);
            if (!retriable || attempt === MAX_RETRIES) break;
            await new Promise((resolve) =>
              setTimeout(resolve, BASE_DELAY_MS * 2 ** attempt),
            );
            attempt += 1;
          }
        }
        const err =
          lastError instanceof Error
            ? lastError
            : new Error(String(lastError));
        logError(err, { where: 'useInitiateTopup' });
        setError(err);
        setLoading(false);
        throw err;
      })();

      inFlight.current = run;
      try {
        return await run;
      } finally {
        inFlight.current = null;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(undefined);
  }, []);

  return { loading, error, data, mutate, reset };
}
