// useCard — fetch and (optionally) poll `GET /card`.
//
// - Wraps useQuery with TTL ~30s, stale 10s, refetch-on-focus per spec
//   docs/mobile/specs/03-cards.ru.md §5.4 (TTL relaxed for active polling).
// - On every successful fetch dispatches `CARD/SET_API` so the WalletContext
//   slice stays in sync with backend truth — Card tab and limits screen read
//   from cached state on mount.
// - When `pollUntilActive=true`, schedules an exponential-backoff refetch
//   every 3s → 6s → 12s → 24s (capped at 30s), stopping when the lifecycle
//   leaves `requested` / `issued`. Hard stops at ~3 minutes; on timeout the
//   caller observes `pollTimedOut=true` and surfaces an inline error.

import { useEffect, useRef, useState } from 'react';

import { useWallet } from '@/context/WalletContext';
import type { Card } from '@/types/card';
import { cardApi } from '@/utils/api/card';
import { useQuery, type QueryResult } from './useQuery';

const QUERY_KEY = '/card';
const TTL_MS = 30_000;
const STALE_MS = 10_000;

const POLL_BACKOFF_MS = [3_000, 6_000, 12_000, 24_000, 30_000];
const POLL_HARD_TIMEOUT_MS = 3 * 60 * 1000;

interface CardEnvelope {
  card: Card | null;
}

export interface UseCardOptions {
  enabled?: boolean;
  pollUntilActive?: boolean;
}

export interface UseCardResult extends QueryResult<CardEnvelope> {
  pollTimedOut: boolean;
}

export function useCard(options: UseCardOptions = {}): UseCardResult {
  const { enabled = true, pollUntilActive = false } = options;
  const { dispatch } = useWallet();

  const query = useQuery<CardEnvelope>(
    QUERY_KEY,
    async () => {
      const data = await cardApi.get();
      return { data };
    },
    {
      enabled,
      ttlMs: TTL_MS,
      staleMs: STALE_MS,
      refetchOnFocus: true,
    },
  );

  // Hydrate the WalletContext slice on every successful fetch.
  useEffect(() => {
    if (!query.data) return;
    dispatch({ type: 'CARD/SET', payload: query.data.card });
  }, [query.data, dispatch]);

  // --- Polling -------------------------------------------------------------

  const [pollTimedOut, setPollTimedOut] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const refetchRef = useRef(query.refetch);
  refetchRef.current = query.refetch;

  const lifecycle = query.data?.card?.lifecycleStatus ?? null;
  const shouldPoll =
    pollUntilActive &&
    enabled &&
    (lifecycle === 'requested' || lifecycle === 'issued');

  useEffect(() => {
    if (!shouldPoll) {
      // Lifecycle left the pending region — reset for next time.
      startedAtRef.current = null;
      attemptRef.current = 0;
      return;
    }

    if (startedAtRef.current === null) {
      startedAtRef.current = Date.now();
      setPollTimedOut(false);
    }

    if (Date.now() - startedAtRef.current >= POLL_HARD_TIMEOUT_MS) {
      setPollTimedOut(true);
      return;
    }

    const delay =
      POLL_BACKOFF_MS[Math.min(attemptRef.current, POLL_BACKOFF_MS.length - 1)];
    const timer = setTimeout(() => {
      attemptRef.current += 1;
      refetchRef.current().catch(() => undefined);
    }, delay);

    return () => clearTimeout(timer);
  }, [shouldPoll, lifecycle]);

  return { ...query, pollTimedOut };
}

export const CARD_QUERY_KEY = QUERY_KEY;
