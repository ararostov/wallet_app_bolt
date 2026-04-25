// useDispute — GET /transactions/{id}/dispute, latest dispute for a transaction.

import { useEffect } from 'react';

import { useWallet } from '@/context/WalletContext';
import type { DisputeRecord } from '@/types/transactions';
import { transactionsApi } from '@/utils/api/transactions';
import { useQuery, type QueryResult } from './useQuery';

const TTL_MS = 2 * 60 * 1000;
const STALE_MS = 30 * 1000;

export function useDispute(
  transactionId: string | null | undefined,
): QueryResult<DisputeRecord> {
  const enabled =
    typeof transactionId === 'string' && transactionId.length > 0;
  const { dispatch } = useWallet();
  const key = enabled
    ? `transactions:dispute:${transactionId}`
    : 'transactions:dispute:disabled';

  const query = useQuery<DisputeRecord>(
    key,
    async () => {
      const data = await transactionsApi.getDispute(transactionId as string);
      return { data };
    },
    {
      enabled,
      ttlMs: TTL_MS,
      staleMs: STALE_MS,
      refetchOnFocus: true,
    },
  );

  useEffect(() => {
    if (!query.data) return;
    dispatch({ type: 'DISPUTES/UPSERT', payload: query.data });
  }, [query.data, dispatch]);

  return query;
}
