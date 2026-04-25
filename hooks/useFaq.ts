// useFaq — GET /help/faqs/{id}.
//
// Backend caches the body for 10 minutes; we mirror that with `ttlMs`.

import type { Faq } from '@/types/help';
import { helpApi } from '@/utils/api/help';
import { useQuery, type QueryResult } from './useQuery';

const TTL_MS = 10 * 60 * 1000;
const STALE_MS = 60 * 1000;

export function useFaq(id: string | null | undefined): QueryResult<Faq> {
  const enabled = typeof id === 'string' && id.length > 0;
  const key = enabled ? `help:faq:${id}` : 'help:faq:disabled';

  return useQuery<Faq>(
    key,
    async () => {
      const data = await helpApi.getFaq(id as string);
      return { data };
    },
    { enabled, ttlMs: TTL_MS, staleMs: STALE_MS, refetchOnFocus: false },
  );
}
