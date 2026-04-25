// useReferralSummary — hydrates the Referral home screen via GET /referral.
// 5-minute TTL with stale-while-revalidate; mirrors `state.referralSummary`
// in WalletContext on every successful fetch so other screens (home tile,
// notifications) can read the cached snapshot without a follow-up fetch.

import { useEffect } from 'react';

import { useWallet } from '@/context/WalletContext';
import type { ReferralSummary } from '@/types/referral';
import { referralApi } from '@/utils/api/referral';

import { useQuery, type QueryResult } from './useQuery';

const TTL_MS = 5 * 60 * 1000;
const STALE_MS = 30 * 1000;

export function useReferralSummary(
  enabled: boolean = true,
): QueryResult<ReferralSummary> {
  const { dispatch } = useWallet();

  const result = useQuery<ReferralSummary>(
    'referral:summary',
    async () => {
      const data = await referralApi.getSummary();
      return { data };
    },
    {
      enabled,
      ttlMs: TTL_MS,
      staleMs: STALE_MS,
      refetchOnFocus: true,
    },
  );

  useEffect(() => {
    if (result.data) {
      dispatch({ type: 'REFERRAL/SET_SUMMARY', payload: result.data });
    }
  }, [result.data, dispatch]);

  return result;
}
