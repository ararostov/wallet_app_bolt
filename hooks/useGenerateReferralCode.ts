// useGenerateReferralCode — POST /referral/generate-code.
//
// Idempotency-Key is owned per hook instance via useRef so retries of the
// same logical rotation reuse the key. Caller must invalidate / refetch
// the summary cache after success — we expose `mutate` and let the screen
// dispatch follow-up work itself.

import { useCallback, useRef, useState } from 'react';

import type { ReferralCodeRotated } from '@/types/referral';
import { ApiError } from '@/utils/errors';
import { newIdempotencyKey } from '@/utils/idempotency';
import { logError } from '@/utils/logger';
import { referralApi } from '@/utils/api/referral';

import { invalidateQueries } from './useQuery';

export interface UseGenerateReferralCodeResult {
  loading: boolean;
  error: Error | null;
  data: ReferralCodeRotated | undefined;
  mutate: () => Promise<ReferralCodeRotated>;
  reset: () => void;
}

const RETRIABLE_STATUSES = [502, 503, 504];
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

export function useGenerateReferralCode(): UseGenerateReferralCodeResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<ReferralCodeRotated | undefined>(undefined);
  const inFlight = useRef<Promise<ReferralCodeRotated> | null>(null);
  const idempotencyKeyRef = useRef<string>(newIdempotencyKey());

  const mutate = useCallback(async (): Promise<ReferralCodeRotated> => {
    if (inFlight.current) return inFlight.current;
    setLoading(true);
    setError(null);

    const run = (async (): Promise<ReferralCodeRotated> => {
      let attempt = 0;
      let lastError: unknown;
      while (attempt <= MAX_RETRIES) {
        try {
          const result = await referralApi.generateCode(
            idempotencyKeyRef.current,
          );
          setData(result);
          setLoading(false);

          // Drop the cached summary so the next mount/focus picks up the
          // fresh code.
          invalidateQueries(['referral:summary']);

          // Rotate the key so a follow-up rotation from the same hook
          // instance does not replay the previous one.
          idempotencyKeyRef.current = newIdempotencyKey();
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
        lastError instanceof Error ? lastError : new Error(String(lastError));
      logError(err, { where: 'useGenerateReferralCode' });
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
  }, []);

  const reset = useCallback(() => {
    idempotencyKeyRef.current = newIdempotencyKey();
    setLoading(false);
    setError(null);
    setData(undefined);
  }, []);

  return { loading, error, data, mutate, reset };
}
