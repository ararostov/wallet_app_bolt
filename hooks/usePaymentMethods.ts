// usePaymentMethods — fetch and cache `GET /payment-methods`.
//
// - TTL ~30s, stale-while-revalidate 10s, refetch-on-focus.
// - On every successful fetch hydrates the WalletContext `paymentMethodsApi`
//   slice so non-list screens (auto-reload picker) can read from cached state
//   without re-fetching.

import { useEffect } from 'react';

import { useWallet } from '@/context/WalletContext';
import type { PaymentMethodListResponse } from '@/types/paymentMethods';
import { paymentMethodsApi } from '@/utils/api/paymentMethods';
import { useQuery, type QueryResult } from './useQuery';

export const PAYMENT_METHODS_QUERY_KEY = '/payment-methods';

const TTL_MS = 30_000;
const STALE_MS = 10_000;

export interface UsePaymentMethodsOptions {
  enabled?: boolean;
  includeArchived?: boolean;
}

export function usePaymentMethods(
  options: UsePaymentMethodsOptions = {},
): QueryResult<PaymentMethodListResponse> {
  const { enabled = true, includeArchived = false } = options;
  const { dispatch } = useWallet();

  const query = useQuery<PaymentMethodListResponse>(
    `${PAYMENT_METHODS_QUERY_KEY}${includeArchived ? '?archived=1' : ''}`,
    async () => {
      const data = await paymentMethodsApi.list({ includeArchived });
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
    dispatch({
      type: 'PAYMENT_METHODS/SET_API',
      payload: query.data.paymentMethods,
    });
  }, [query.data, dispatch]);

  return query;
}
