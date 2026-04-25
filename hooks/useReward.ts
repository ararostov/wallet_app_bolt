// useReward — single reward detail (GET /rewards/{id}).
// Uses the generic useQuery with a 5 min TTL and refetch-on-focus.

import type { Reward } from '@/types/loyalty';
import { loyaltyApi } from '@/utils/api/loyalty';
import { useQuery, type QueryResult } from './useQuery';

const TTL_MS = 5 * 60 * 1000;
const STALE_MS = 30 * 1000;

export function useReward(id: string | null | undefined): QueryResult<Reward> {
  const enabled = typeof id === 'string' && id.length > 0;
  const key = enabled ? `rewards:detail:${id}` : 'rewards:detail:disabled';

  return useQuery<Reward>(
    key,
    async () => {
      const data = await loyaltyApi.getReward(id as string);
      return { data };
    },
    {
      enabled,
      ttlMs: TTL_MS,
      staleMs: STALE_MS,
      refetchOnFocus: true,
    },
  );
}
