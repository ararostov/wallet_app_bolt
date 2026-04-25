// useFriend — single GET /referral/friends/{id}.
// Uses the generic useQuery with a 5 min TTL and refetch-on-focus.

import type { ReferralFriendDetail } from '@/types/referral';
import { referralApi } from '@/utils/api/referral';

import { useQuery, type QueryResult } from './useQuery';

const TTL_MS = 5 * 60 * 1000;
const STALE_MS = 30 * 1000;

export function useFriend(
  id: string | null | undefined,
): QueryResult<ReferralFriendDetail> {
  const enabled = typeof id === 'string' && id.length > 0;
  const key = enabled
    ? `referral:friend:${id}`
    : 'referral:friend:disabled';

  return useQuery<ReferralFriendDetail>(
    key,
    async () => {
      const data = await referralApi.getFriend(id as string);
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
