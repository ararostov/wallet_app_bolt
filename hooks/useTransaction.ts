// useTransaction — single transaction detail (GET /transactions/{id}).
// Wraps useQuery with a 2 min TTL and refetch-on-focus.

import { useEffect } from 'react';

import { useWallet } from '@/context/WalletContext';
import type { TransactionDetail } from '@/types/transactions';
import { transactionsApi } from '@/utils/api/transactions';
import { useQuery, type QueryResult } from './useQuery';

const TTL_MS = 2 * 60 * 1000;
const STALE_MS = 30 * 1000;

export function useTransaction(
  id: string | null | undefined,
): QueryResult<TransactionDetail> {
  const enabled = typeof id === 'string' && id.length > 0;
  const { dispatch } = useWallet();
  const key = enabled ? `transactions:detail:${id}` : 'transactions:detail:disabled';

  const query = useQuery<TransactionDetail>(
    key,
    async () => {
      const data = await transactionsApi.get(id as string);
      return { data };
    },
    {
      enabled,
      ttlMs: TTL_MS,
      staleMs: STALE_MS,
      refetchOnFocus: true,
    },
  );

  // Mirror the detail row + active dispute into context so the home tab
  // and list-screen rows stay in sync after a fresh detail read.
  useEffect(() => {
    if (!query.data) return;
    dispatch({
      type: 'TRANSACTIONS/UPSERT',
      payload: query.data.transaction,
    });
    if (query.data.activeDispute) {
      // The detail endpoint only returns the summary; we still want a
      // record in the disputes map so the banner can render from cache.
      // Promote the summary to a partial DisputeRecord shape — fields the
      // dispute screen needs that aren't in the summary stay null until a
      // dedicated GET /dispute lands.
      const summary = query.data.activeDispute;
      dispatch({
        type: 'DISPUTES/UPSERT',
        payload: {
          id: summary.id,
          transactionId: query.data.transaction.id,
          reference: summary.reference,
          reason: 'other',
          description: '',
          status: summary.status,
          resolutionOutcome: null,
          resolutionNote: null,
          refundAmount: null,
          attachments: [],
          submittedAt: summary.submittedAt,
          targetResolutionAt: summary.targetResolutionAt,
          resolvedAt: null,
        },
      });
    }
  }, [query.data, dispatch]);

  return query;
}
