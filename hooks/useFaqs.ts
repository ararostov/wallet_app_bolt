// useFaqs — GET /help/faqs.
//
// Key-stable cache; the query key folds `category` and `q` so the screen can
// share filtered results across mounts. The screen owns search debouncing
// (300ms) per spec §4.1; this hook just reads whatever filters it is given.

import { useMemo } from 'react';

import type { FaqListItem, FaqListMeta } from '@/types/help';
import { helpApi } from '@/utils/api/help';
import { useQuery, type QueryResult } from './useQuery';

export interface UseFaqsOptions {
  category?: string;
  q?: string;
  enabled?: boolean;
  limit?: number;
}

export interface UseFaqsResult extends QueryResult<FaqListItem[]> {
  categories: string[];
}

const TTL_MS = 5 * 60 * 1000;
const STALE_MS = 60 * 1000;

export function useFaqs(options: UseFaqsOptions = {}): UseFaqsResult {
  const { category, q, enabled = true, limit = 50 } = options;
  const key = useMemo(
    () => `help:faqs:${category ?? '*'}:${q ?? ''}:${limit}`,
    [category, q, limit],
  );

  const query = useQuery<FaqListItem[]>(
    key,
    async () => {
      const result = await helpApi.listFaqs({ category, q, limit });
      return { data: result.data, meta: result.meta };
    },
    { enabled, ttlMs: TTL_MS, staleMs: STALE_MS, refetchOnFocus: true },
  );

  const meta = (query.meta ?? {}) as FaqListMeta;
  return { ...query, categories: meta.categories ?? [] };
}
