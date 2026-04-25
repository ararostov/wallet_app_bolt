// useSearchTransactions — debounced search over the customer's history.
//
// Debounces the query 300 ms; only fires when q.length >= 2 (matches backend
// minimum). Uses the cached useQuery layer with a short TTL — repeat hits on
// the same query within the TTL window are served instantly.

import { useEffect, useState } from 'react';

import type {
  TransactionRecord,
  TransactionSearchMeta,
  TransactionType,
} from '@/types/transactions';
import { transactionsApi } from '@/utils/api/transactions';
import { useQuery } from './useQuery';

const DEBOUNCE_MS = 300;
const TTL_MS = 30 * 1000;
const STALE_MS = 10 * 1000;
const MIN_QUERY_LEN = 2;

export interface UseSearchTransactionsOptions {
  type?: TransactionType;
  limit?: number;
}

export interface UseSearchTransactionsResult {
  data: TransactionRecord[];
  meta: TransactionSearchMeta | undefined;
  loading: boolean;
  error: Error | null;
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

export function useSearchTransactions(
  query: string,
  options: UseSearchTransactionsOptions = {},
): UseSearchTransactionsResult {
  const debounced = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  const enabled = debounced.length >= MIN_QUERY_LEN;
  const cacheKey = `transactions:search:${debounced}:${options.type ?? 'all'}:${options.limit ?? 20}`;

  const result = useQuery<TransactionRecord[]>(
    enabled ? cacheKey : 'transactions:search:disabled',
    async () => {
      const r = await transactionsApi.search({
        q: debounced,
        type: options.type,
        limit: options.limit,
      });
      return { data: r.data, meta: r.meta };
    },
    {
      enabled,
      ttlMs: TTL_MS,
      staleMs: STALE_MS,
      refetchOnFocus: false,
    },
  );

  return {
    data: result.data ?? [],
    meta: result.meta as TransactionSearchMeta | undefined,
    loading: result.loading,
    error: result.error,
  };
}
