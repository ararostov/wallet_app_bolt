// useReferralFriends — cursor-paginated list of GET /referral/friends.
//
// Pattern mirrors useTransactions / useRewards: owns the page state, hydrates
// the WalletContext slice on every successful fetch (SET on first page,
// APPEND on subsequent pages), and lets callers drive `loadMore` / `refresh`.

import { useCallback, useEffect, useRef, useState } from 'react';

import { useWallet } from '@/context/WalletContext';
import type { ReferralFriend, ReferralStage } from '@/types/referral';
import { referralApi } from '@/utils/api/referral';
import { logError } from '@/utils/logger';

export interface UseReferralFriendsOptions {
  stage?: ReferralStage;
  limit?: number;
  enabled?: boolean;
}

export interface UseReferralFriendsResult {
  data: ReferralFriend[];
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_LIMIT = 20;

export function useReferralFriends(
  options: UseReferralFriendsOptions = {},
): UseReferralFriendsResult {
  const { stage, limit = DEFAULT_LIMIT, enabled = true } = options;
  const { dispatch } = useWallet();

  const [data, setData] = useState<ReferralFriend[]>([]);
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

        const params: Parameters<typeof referralApi.listFriends>[0] = {
          limit,
        };
        if (stage) params.stage = stage;
        if (mode === 'more' && cursor) params.cursor = cursor;

        const result = await referralApi.listFriends(params);
        if (!mountedRef.current || reqId !== requestIdRef.current) return;

        const items = result.data;
        const pagination = result.meta?.pagination;
        const nextCursor = pagination?.nextCursor ?? null;
        const more = pagination?.hasMore ?? false;

        if (mode === 'more') {
          setData((prev) => {
            const known = new Set(prev.map((f) => f.id));
            const fresh = items.filter((f) => !known.has(f.id));
            const merged = [...prev, ...fresh];
            dispatch({
              type: 'REFERRAL/APPEND_FRIENDS_API',
              payload: fresh,
            });
            return merged;
          });
        } else {
          setData(items);
          dispatch({ type: 'REFERRAL/SET_FRIENDS_API', payload: items });
        }
        setCursor(nextCursor);
        setHasMore(more);
        setError(null);
      } catch (e) {
        if (!mountedRef.current || reqId !== requestIdRef.current) return;
        logError(e, { where: 'useReferralFriends', stage });
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (mountedRef.current && reqId === requestIdRef.current) {
          if (mode === 'initial') setLoading(false);
          else if (mode === 'refresh') setRefreshing(false);
          else setLoadingMore(false);
        }
      }
    },
    [enabled, limit, stage, cursor, dispatch],
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
  }, [enabled, stage, limit]);

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
