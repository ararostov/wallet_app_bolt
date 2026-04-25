// useTransactions — cursor-paginated list of customer transactions.
//
// Owns its own state (cache layer in useQuery does not natively support
// pagination). Exposes `data`, `loading`, `loadMore`, `refresh`, `hasMore`,
// `error`. On every successful fetch hydrates the WalletContext
// `transactionsApi` slice (SET on first page, APPEND on subsequent pages).

import { useCallback, useEffect, useRef, useState } from 'react';

import { useWallet } from '@/context/WalletContext';
import type { TransactionRecord, TransactionType } from '@/types/transactions';
import { transactionsApi } from '@/utils/api/transactions';
import { logError } from '@/utils/logger';

export interface UseTransactionsOptions {
  type?: TransactionType;
  limit?: number;
  enabled?: boolean;
}

export interface UseTransactionsResult {
  data: TransactionRecord[];
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_LIMIT = 20;

export function useTransactions(
  options: UseTransactionsOptions = {},
): UseTransactionsResult {
  const { type, limit = DEFAULT_LIMIT, enabled = true } = options;
  const { dispatch } = useWallet();

  const [data, setData] = useState<TransactionRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Tracks the latest filter so an in-flight response from a stale filter
  // (race when user toggles chips quickly) is dropped on arrival.
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const fetchPage = useCallback(
    async (mode: 'initial' | 'refresh' | 'more'): Promise<void> => {
      if (!enabled) return;
      const reqId = (requestIdRef.current += 1);
      try {
        if (mode === 'initial') setLoading(true);
        else if (mode === 'refresh') setRefreshing(true);
        else setLoadingMore(true);

        const params: Parameters<typeof transactionsApi.list>[0] = { limit };
        if (type) params.type = type;
        if (mode === 'more' && cursor) params.cursor = cursor;

        const result = await transactionsApi.list(params);
        if (!mountedRef.current || reqId !== requestIdRef.current) return;

        const items = result.data;
        const meta = result.meta?.pagination;
        const nextCursor = meta?.nextCursor ?? null;
        const more = meta?.hasMore ?? false;

        if (mode === 'more') {
          setData((prev) => {
            const known = new Set(prev.map((t) => t.id));
            const fresh = items.filter((t) => !known.has(t.id));
            const merged = [...prev, ...fresh];
            dispatch({
              type: 'TRANSACTIONS/APPEND_API',
              payload: { items: fresh },
            });
            return merged;
          });
        } else {
          setData(items);
          dispatch({
            type: 'TRANSACTIONS/SET_API',
            payload: { items },
          });
        }
        setCursor(nextCursor);
        setHasMore(more);
        setError(null);
      } catch (e) {
        if (!mountedRef.current || reqId !== requestIdRef.current) return;
        logError(e, { where: 'useTransactions', type });
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (mountedRef.current && reqId === requestIdRef.current) {
          if (mode === 'initial') setLoading(false);
          else if (mode === 'refresh') setRefreshing(false);
          else setLoadingMore(false);
        }
      }
    },
    [enabled, limit, type, cursor, dispatch],
  );

  // Initial / filter-change fetch. Reset list on filter change.
  useEffect(() => {
    mountedRef.current = true;
    setData([]);
    setCursor(null);
    setHasMore(false);
    setError(null);
    if (enabled) {
      void fetchPage('initial');
    } else {
      setLoading(false);
    }
    return () => {
      mountedRef.current = false;
    };
    // intentionally NOT depending on fetchPage — we want a fresh fetch only
    // when filter (type) / enabled flag changes, not on every cursor mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, type, limit]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore || !cursor) return;
    await fetchPage('more');
  }, [fetchPage, loadingMore, loading, hasMore, cursor]);

  const refresh = useCallback(async () => {
    await fetchPage('refresh');
  }, [fetchPage]);

  return {
    data,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    error,
    loadMore,
    refresh,
  };
}
