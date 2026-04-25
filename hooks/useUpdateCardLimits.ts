// useUpdateCardLimits — PATCH /card/limits.
//
// Optimistic dispatch is left to the caller (the limits screen first checks
// validation, then calls mutate). On success: replace the slice with the
// server-truth response so `*IsDefault` flags reflect reality.

import { useWallet } from '@/context/WalletContext';
import type { Card, UpdateLimitsRequest } from '@/types/card';
import { cardApi } from '@/utils/api/card';
import { CARD_QUERY_KEY } from './useCard';
import { useMutation, type MutationResult } from './useMutation';

interface CardEnvelope {
  card: Card | null;
}

export function useUpdateCardLimits(): MutationResult<
  UpdateLimitsRequest,
  CardEnvelope
> {
  const { dispatch } = useWallet();

  return useMutation<UpdateLimitsRequest, CardEnvelope>(
    (vars, { idempotencyKey }) => cardApi.updateLimits(vars, idempotencyKey),
    {
      retry: 1,
      invalidateKeys: [CARD_QUERY_KEY],
      onSuccess: (response) => {
        dispatch({ type: 'CARD/SET_API', payload: response.card });
      },
    },
  );
}
