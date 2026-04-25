// useSetDefaultPaymentMethod — PATCH /payment-methods/{id}/set-default.
//
// Optimistic: dispatches SET_DEFAULT_API immediately, rolls back on error
// by re-dispatching SET_API with the previous list. Idempotent at the
// transport level (Idempotency-Key + server returns the unchanged record
// when the method is already default).

import { useCallback } from 'react';

import { useWallet } from '@/context/WalletContext';
import type {
  PaymentMethod,
  PaymentMethodEnvelopeResponse,
} from '@/types/paymentMethods';
import { paymentMethodsApi } from '@/utils/api/paymentMethods';
import { newIdempotencyKey } from '@/utils/idempotency';
import { logError } from '@/utils/logger';
import { invalidateQuery } from './useQuery';
import { PAYMENT_METHODS_QUERY_KEY } from './usePaymentMethods';

export interface UseSetDefaultPaymentMethodResult {
  setDefault: (id: string) => Promise<PaymentMethodEnvelopeResponse>;
}

export function useSetDefaultPaymentMethod(): UseSetDefaultPaymentMethodResult {
  const { state, dispatch } = useWallet();

  const setDefault = useCallback(
    async (id: string): Promise<PaymentMethodEnvelopeResponse> => {
      const previous: PaymentMethod[] | null = state.paymentMethodsApi
        ? [...state.paymentMethodsApi]
        : null;

      dispatch({ type: 'PAYMENT_METHODS/SET_DEFAULT_API', payload: { id } });

      try {
        const response = await paymentMethodsApi.setDefault(
          id,
          newIdempotencyKey(),
        );
        dispatch({
          type: 'PAYMENT_METHODS/UPSERT_API',
          payload: response.paymentMethod,
        });
        invalidateQuery(PAYMENT_METHODS_QUERY_KEY);
        return response;
      } catch (e) {
        logError(e, { where: 'useSetDefaultPaymentMethod', id });
        if (previous) {
          dispatch({ type: 'PAYMENT_METHODS/SET_API', payload: previous });
        }
        throw e;
      }
    },
    [state.paymentMethodsApi, dispatch],
  );

  return { setDefault };
}
