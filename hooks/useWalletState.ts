// Composite /wallet/state hook for the Home tab and the Auto-reload screen.
//
// - Wraps useQuery with TTL 30 s / stale 10 s / refetch-on-focus per spec
//   docs/mobile/specs/02-wallet.ru.md §6.
// - On every successful fetch, dispatches `WALLET/HYDRATE_FROM_STATE` so the
//   WalletContext slice (`wallet`, `card`, `tierSummary`, `autoReload`) stays
//   in sync with backend truth. Cached state is read by the screens on mount;
//   this hook simply refreshes it.

import { useEffect } from 'react';

import { useWallet } from '@/context/WalletContext';
import type { WalletStateData, WalletStateInclude } from '@/types/wallet';
import { walletApi } from '@/utils/api/wallet';
import { useQuery, type QueryOptions, type QueryResult } from './useQuery';

const QUERY_KEY = '/wallet/state';
const TTL_MS = 30_000;
const STALE_MS = 10_000;

export type UseWalletStateOptions = {
  enabled?: boolean;
  ttlMs?: number;
  staleMs?: number;
  include?: WalletStateInclude[];
};

export function useWalletState(
  options: UseWalletStateOptions = {},
): QueryResult<WalletStateData> {
  const { dispatch } = useWallet();
  const { enabled = true, ttlMs = TTL_MS, staleMs = STALE_MS, include } = options;

  const queryOptions: QueryOptions = {
    enabled,
    ttlMs,
    staleMs,
    refetchOnFocus: true,
  };

  const query = useQuery<WalletStateData>(
    include && include.length > 0 ? `${QUERY_KEY}?include=${include.join(',')}` : QUERY_KEY,
    async () => {
      const data = await walletApi.getState(include ? { include } : undefined);
      return { data };
    },
    queryOptions,
  );

  useEffect(() => {
    if (!query.data) return;
    dispatch({ type: 'WALLET/HYDRATE_FROM_STATE', payload: query.data });
  }, [query.data, dispatch]);

  return query;
}

export const WALLET_STATE_QUERY_KEY = QUERY_KEY;
