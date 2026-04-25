// useTierState — GET /tier with 5 min stale window inside a 1 h TTL cache.
// Hydrates state.tier on every successful fetch.

import { useEffect } from 'react';

import { useWallet } from '@/context/WalletContext';
import type { Tier } from '@/types/loyalty';
import { loyaltyApi } from '@/utils/api/loyalty';
import { useQuery, type QueryResult } from './useQuery';

const TTL_MS = 60 * 60 * 1000;
const STALE_MS = 5 * 60 * 1000;

export function useTierState(): QueryResult<Tier> {
  const { dispatch } = useWallet();

  const query = useQuery<Tier>(
    'tier',
    async () => {
      const data = await loyaltyApi.getTier();
      return { data };
    },
    {
      ttlMs: TTL_MS,
      staleMs: STALE_MS,
      refetchOnFocus: true,
    },
  );

  useEffect(() => {
    if (query.data) {
      dispatch({ type: 'TIER/SET', payload: query.data });
    }
  }, [query.data, dispatch]);

  return query;
}
