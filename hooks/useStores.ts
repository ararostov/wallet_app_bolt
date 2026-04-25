// useStores — GET /stores.
//
// City filter only (no geo-search on MVP per spec §4.7). Long TTL because
// store data changes infrequently and the response is shown read-only.
// Screen owns its 300ms search debounce.

import { useMemo } from 'react';

import type { Store, StoreListMeta } from '@/types/stores';
import { storesApi } from '@/utils/api/stores';
import { useQuery, type QueryResult } from './useQuery';

export interface UseStoresOptions {
  city?: string;
  enabled?: boolean;
  limit?: number;
}

export interface UseStoresResult extends QueryResult<Store[]> {
  hasMore: boolean;
}

// Backend Cache-Control says 5 min; spec calls for 24h client cache. Pick the
// looser of the two — 5 min is the conservative truth.
const TTL_MS = 5 * 60 * 1000;
const STALE_MS = 60 * 1000;

export function useStores(options: UseStoresOptions = {}): UseStoresResult {
  const { city, enabled = true, limit = 50 } = options;
  const key = useMemo(() => `stores:list:${city ?? ''}:${limit}`, [city, limit]);

  const query = useQuery<Store[]>(
    key,
    async () => {
      const result = await storesApi.list({ city, limit });
      return { data: result.data, meta: result.meta };
    },
    { enabled, ttlMs: TTL_MS, staleMs: STALE_MS, refetchOnFocus: true },
  );

  const meta = (query.meta ?? {}) as StoreListMeta;
  return { ...query, hasMore: meta.pagination?.hasMore ?? false };
}
