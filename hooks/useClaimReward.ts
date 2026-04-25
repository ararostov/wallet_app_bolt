// useClaimReward — POST /rewards/{id}/claim.
//
// Idempotency-Key is owned per hook instance via useRef so retries of the
// same logical claim reuse the key, while a fresh sheet open (new component
// instance) gets a new key. After success we:
//   1. Upsert the post-claim reward into the rewards slice (status=claimed).
//   2. Refresh the wallet balance via walletApi.getBalance() and dispatch
//      WALLET/SET_BALANCE — the spec mandates we re-read the authoritative
//      figure rather than rely on the (potentially stale on idempotent
//      replay) wallet snapshot in the claim response.
//   3. Invalidate the wallet/transactions/rewards query caches.

import { useCallback, useRef, useState } from 'react';

import { useWallet } from '@/context/WalletContext';
import type { ClaimRewardRequest, ClaimedReward } from '@/types/loyalty';
import { ApiError } from '@/utils/errors';
import { newIdempotencyKey } from '@/utils/idempotency';
import { logError } from '@/utils/logger';
import { loyaltyApi } from '@/utils/api/loyalty';
import { walletApi } from '@/utils/api/wallet';
import { invalidateQueries } from './useQuery';

export interface ClaimRewardVars {
  rewardId: string;
  body?: ClaimRewardRequest;
}

export interface UseClaimRewardResult {
  loading: boolean;
  error: Error | null;
  data: ClaimedReward | undefined;
  mutate: (vars: ClaimRewardVars) => Promise<ClaimedReward>;
  reset: () => void;
}

const RETRIABLE_STATUSES = [429, 502, 503, 504];
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

export function useClaimReward(): UseClaimRewardResult {
  const { dispatch } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<ClaimedReward | undefined>(undefined);
  const inFlight = useRef<Promise<ClaimedReward> | null>(null);
  const idempotencyKeyRef = useRef<string>(newIdempotencyKey());

  const mutate = useCallback(
    async (vars: ClaimRewardVars): Promise<ClaimedReward> => {
      if (inFlight.current) return inFlight.current;
      setLoading(true);
      setError(null);

      const run = (async (): Promise<ClaimedReward> => {
        let attempt = 0;
        let lastError: unknown;
        while (attempt <= MAX_RETRIES) {
          try {
            const result = await loyaltyApi.claimReward(
              vars.rewardId,
              vars.body ?? { claimTarget: 'wallet' },
              idempotencyKeyRef.current,
            );
            setData(result);
            setLoading(false);

            // Mirror the post-claim reward into the rewards slice.
            dispatch({ type: 'REWARDS/UPSERT', payload: result.reward });

            // Refresh wallet balance authoritatively (idempotent replays
            // surface a stale snapshot — see spec §6.4).
            try {
              const fresh = await walletApi.getBalance();
              dispatch({
                type: 'WALLET/SET_BALANCE',
                payload: {
                  available: fresh.available,
                  pending: fresh.pending,
                  status: fresh.status,
                },
              });
            } catch (refreshError) {
              // Don't break the claim flow if the balance refresh fails —
              // log and continue. The next focus on the home tab will
              // re-read it.
              logError(refreshError, {
                where: 'useClaimReward.balanceRefresh',
              });
            }

            // Invalidate query caches so the next focus on rewards / wallet
            // / transactions re-reads the authoritative state.
            invalidateQueries([
              `rewards:detail:${vars.rewardId}`,
              'wallet:balance',
              'wallet:state',
              'transactions:first-page',
            ]);

            // Rotate the idempotency key so a follow-up claim from the same
            // hook instance doesn't replay the previous one.
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
          lastError instanceof Error
            ? lastError
            : new Error(String(lastError));
        logError(err, { where: 'useClaimReward', rewardId: vars.rewardId });
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
    [dispatch],
  );

  const reset = useCallback(() => {
    idempotencyKeyRef.current = newIdempotencyKey();
    setLoading(false);
    setError(null);
    setData(undefined);
  }, []);

  return { loading, error, data, mutate, reset };
}
