// usePerks — GET /perks with a 5 min stale window inside a 1 h TTL cache.
// Hydrates state.perksApi on every successful fetch.

import { useEffect } from 'react';

import { useWallet } from '@/context/WalletContext';
import type { Perk } from '@/types/loyalty';
import { loyaltyApi } from '@/utils/api/loyalty';
import { useQuery, type QueryResult } from './useQuery';

const TTL_MS = 60 * 60 * 1000;
const STALE_MS = 5 * 60 * 1000;

export function usePerks(tier?: string): QueryResult<Perk[]> {
  const { dispatch } = useWallet();
  const key = `perks:${tier ?? 'current'}`;

  const query = useQuery<Perk[]>(
    key,
    async () => {
      const data = await loyaltyApi.listPerks(tier ? { tier } : {});
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
      dispatch({ type: 'PERKS/SET_API', payload: query.data });
    }
  }, [query.data, dispatch]);

  return query;
}
