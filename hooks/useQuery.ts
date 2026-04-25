// Generic fetch hook with in-memory cache, TTL, stale-while-revalidate
// and refetch-on-focus semantics.
//
// API surface mirrors the spec in docs/mobile/infrastructure.ru.md §8.1.

import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { logError } from '@/utils/logger';

type CacheEntry<T> = {
  data: T | undefined;
  meta: unknown;
  fetchedAt: number;
  inflight?: Promise<void>;
};

const cache: Map<string, CacheEntry<unknown>> = new Map();

export type QueryOptions = {
  enabled?: boolean;
  ttlMs?: number; // hard cache lifetime; default 5 min
  staleMs?: number; // background revalidation threshold; default 30 sec
  refetchOnFocus?: boolean;
};

export type QueryResult<T> = {
  data: T | undefined;
  meta: unknown;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

export type Fetcher<T> = () => Promise<{ data: T; meta?: unknown }>;

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_STALE_MS = 30 * 1000;

export function invalidateQuery(key: string): void {
  cache.delete(key);
}

export function invalidateQueries(keys: string[]): void {
  keys.forEach(invalidateQuery);
}

export function useQuery<T>(
  key: string,
  fetcher: Fetcher<T>,
  options: QueryOptions = {},
): QueryResult<T> {
  const {
    enabled = true,
    ttlMs = DEFAULT_TTL_MS,
    staleMs = DEFAULT_STALE_MS,
    refetchOnFocus = true,
  } = options;

  const initial = cache.get(key) as CacheEntry<T> | undefined;
  const [data, setData] = useState<T | undefined>(initial?.data);
  const [meta, setMeta] = useState<unknown>(initial?.meta);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled && !initial);

  const mountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const runFetch = useCallback(
    async (force: boolean): Promise<void> => {
      const existing = cache.get(key) as CacheEntry<T> | undefined;
      const fresh =
        existing && Date.now() - existing.fetchedAt < ttlMs && !force;

      if (existing) {
        if (mountedRef.current) {
          setData(existing.data);
          setMeta(existing.meta);
        }
      }

      if (fresh) {
        if (mountedRef.current) setLoading(false);
        // Stale-while-revalidate: refresh quietly if older than staleMs.
        if (Date.now() - existing!.fetchedAt < staleMs) return;
      }

      if (existing?.inflight) {
        await existing.inflight;
        if (mountedRef.current) {
          const post = cache.get(key) as CacheEntry<T> | undefined;
          setData(post?.data);
          setMeta(post?.meta);
          setLoading(false);
        }
        return;
      }

      const promise = (async () => {
        try {
          const result = await fetcherRef.current();
          cache.set(key, {
            data: result.data,
            meta: result.meta,
            fetchedAt: Date.now(),
          });
          if (mountedRef.current) {
            setData(result.data);
            setMeta(result.meta);
            setError(null);
          }
        } catch (e) {
          logError(e, { where: 'useQuery', key });
          if (mountedRef.current) {
            setError(e instanceof Error ? e : new Error(String(e)));
          }
        } finally {
          const entry = cache.get(key);
          if (entry) {
            entry.inflight = undefined;
          }
          if (mountedRef.current) setLoading(false);
        }
      })();

      const entry: CacheEntry<T> = existing ?? {
        data: undefined,
        meta: undefined,
        fetchedAt: 0,
      };
      entry.inflight = promise;
      cache.set(key, entry);
      if (mountedRef.current && !existing) setLoading(true);
      await promise;
    },
    [key, ttlMs, staleMs],
  );

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      void runFetch(false);
    }
    return () => {
      mountedRef.current = false;
    };
  }, [enabled, runFetch]);

  useFocusEffect(
    useCallback(() => {
      if (!refetchOnFocus || !enabled) return;
      void runFetch(false);
      return () => undefined;
    }, [enabled, refetchOnFocus, runFetch]),
  );

  const refetch = useCallback(() => runFetch(true), [runFetch]);

  return { data, meta, loading, error, refetch };
}
