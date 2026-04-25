// useArchivePaymentMethod — DELETE /payment-methods/{id}.
//
// Optimistic: dispatches REMOVE_API immediately, rolls back on error by
// re-dispatching SET_API with the previous list. Idempotent. On success
// also applies the server-returned `newDefaultPaymentMethodId` (if any)
// so the UI reflects automatic default promotion.

import { useCallback } from 'react';

import { useWallet } from '@/context/WalletContext';
import type {
  PaymentMethod,
  PaymentMethodArchivedResponse,
} from '@/types/paymentMethods';
import { paymentMethodsApi } from '@/utils/api/paymentMethods';
import { newIdempotencyKey } from '@/utils/idempotency';
import { logError } from '@/utils/logger';
import { invalidateQuery } from './useQuery';
import { PAYMENT_METHODS_QUERY_KEY } from './usePaymentMethods';

export interface UseArchivePaymentMethodResult {
  archive: (id: string) => Promise<PaymentMethodArchivedResponse>;
}

export function useArchivePaymentMethod(): UseArchivePaymentMethodResult {
  const { state, dispatch } = useWallet();

  const archive = useCallback(
    async (id: string): Promise<PaymentMethodArchivedResponse> => {
      const previous: PaymentMethod[] | null = state.paymentMethodsApi
        ? [...state.paymentMethodsApi]
        : null;

      dispatch({ type: 'PAYMENT_METHODS/REMOVE_API', payload: { id } });

      try {
        const response = await paymentMethodsApi.archive(
          id,
          newIdempotencyKey(),
        );
        if (response.newDefaultPaymentMethodId) {
          dispatch({
            type: 'PAYMENT_METHODS/SET_DEFAULT_API',
            payload: { id: response.newDefaultPaymentMethodId },
          });
        }
        invalidateQuery(PAYMENT_METHODS_QUERY_KEY);
        return response;
      } catch (e) {
        logError(e, { where: 'useArchivePaymentMethod', id });
        if (previous) {
          dispatch({ type: 'PAYMENT_METHODS/SET_API', payload: previous });
        }
        throw e;
      }
    },
    [state.paymentMethodsApi, dispatch],
  );

  return { archive };
}
