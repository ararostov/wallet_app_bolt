// useRewards — cursor-paginated list of loyalty rewards.
//
// Mirrors the pattern of useTransactions: owns local state for cursor +
// items, hydrates the WalletContext rewardsApi slice on every successful
// page (SET on first page, APPEND on subsequent pages), and computes the
// hero summary (earned all time / pending) which is dispatched alongside.

import { useCallback, useEffect, useRef, useState } from 'react';

import { useWallet } from '@/context/WalletContext';
import type {
  Reward,
  RewardBucket,
  RewardStatus,
} from '@/types/loyalty';
import { loyaltyApi } from '@/utils/api/loyalty';
import { logError } from '@/utils/logger';

export interface UseRewardsOptions {
  status?: RewardStatus;
  bucket?: RewardBucket | 'all';
  limit?: number;
  enabled?: boolean;
}

export interface UseRewardsResult {
  data: Reward[];
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_LIMIT = 20;

function computeSummary(items: Reward[]): {
  earnedAllTimeMinor: number;
  pendingMinor: number;
  currency: string;
} | null {
  if (items.length === 0) return null;
  let earnedAllTimeMinor = 0;
  let pendingMinor = 0;
  for (const r of items) {
    if (r.status !== 'cancelled' && r.status !== 'expired') {
      earnedAllTimeMinor += r.amount.amountMinor;
    }
    if (r.bucket === 'cashback' && r.status === 'pending') {
      pendingMinor += r.amount.amountMinor;
    }
  }
  return {
    earnedAllTimeMinor,
    pendingMinor,
    currency: items[0].amount.currency,
  };
}

export function useRewards(options: UseRewardsOptions = {}): UseRewardsResult {
  const { status, bucket, limit = DEFAULT_LIMIT, enabled = true } = options;
  const { dispatch } = useWallet();

  const [data, setData] = useState<Reward[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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

        const params: Parameters<typeof loyaltyApi.listRewards>[0] = { limit };
        if (status) params.status = status;
        if (mode === 'more' && cursor) params.cursor = cursor;

        const result = await loyaltyApi.listRewards(params);
        if (!mountedRef.current || reqId !== requestIdRef.current) return;

        const items = result.data;
        const pagination = result.meta?.pagination;
        const nextCursor = pagination?.nextCursor ?? null;
        const more = pagination?.hasMore ?? false;

        if (mode === 'more') {
          setData((prev) => {
            const known = new Set(prev.map((r) => r.id));
            const fresh = items.filter((r) => !known.has(r.id));
            const merged = [...prev, ...fresh];
            dispatch({
              type: 'REWARDS/APPEND',
              payload: fresh,
            });
            const summary = computeSummary(merged);
            if (summary) {
              dispatch({ type: 'REWARDS/SET_SUMMARY', payload: summary });
            }
            return merged;
          });
        } else {
          setData(items);
          dispatch({ type: 'REWARDS/SET', payload: items });
          const summary = computeSummary(items);
          if (summary) {
            dispatch({ type: 'REWARDS/SET_SUMMARY', payload: summary });
          }
        }
        setCursor(nextCursor);
        setHasMore(more);
        setError(null);
      } catch (e) {
        if (!mountedRef.current || reqId !== requestIdRef.current) return;
        logError(e, { where: 'useRewards', status, bucket });
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (mountedRef.current && reqId === requestIdRef.current) {
          if (mode === 'initial') setLoading(false);
          else if (mode === 'refresh') setRefreshing(false);
          else setLoadingMore(false);
        }
      }
    },
    [enabled, limit, status, bucket, cursor, dispatch],
  );

  // Initial / filter-change fetch — reset list on filter change.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, status, limit]);

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
