// useUnfreezeCard — PATCH /card/unfreeze (PIN-gated, optimistic).
//
// PIN is forwarded once and never persisted. On 422 CARD_INVALID_PIN the
// caller keeps the sheet open and clears the input — the rollback restores
// the previous frozen snapshot so the UI re-locks if the optimistic flip
// already happened.

import { useWallet } from '@/context/WalletContext';
import type { Card, UnfreezeRequest } from '@/types/card';
import { cardApi } from '@/utils/api/card';
import { CARD_QUERY_KEY } from './useCard';
import { useMutation, type MutationResult } from './useMutation';

interface CardEnvelope {
  card: Card | null;
}

export function useUnfreezeCard(): MutationResult<UnfreezeRequest, CardEnvelope> {
  const { state, dispatch } = useWallet();

  return useMutation<UnfreezeRequest, CardEnvelope>(
    async (vars, { idempotencyKey }) => {
      const snapshot = state.cardApi;
      dispatch({
        type: 'CARD/UPDATE_API_STATUS',
        payload: {
          lifecycleStatus: 'active',
          status: 'active',
          frozenAt: null,
        },
      });
      try {
        return await cardApi.unfreeze(vars, idempotencyKey);
      } catch (e) {
        dispatch({
          type: 'CARD/SET_API',
          payload:
            snapshot && 'lifecycleStatus' in snapshot
              ? (snapshot as Card)
              : null,
        });
        throw e;
      }
    },
    {
      // No transport retry on PIN flow — 422 is final and 502 should bubble
      // back to the user with a fresh attempt.
      retry: 1,
      invalidateKeys: [CARD_QUERY_KEY],
      onSuccess: (response) => {
        dispatch({ type: 'CARD/SET_API', payload: response.card });
      },
    },
  );
}
