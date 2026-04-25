// useFreezeCard — PATCH /card/freeze with optimistic update + rollback.
//
// On call: dispatch CARD/UPDATE_API_STATUS to `frozen` so the UI flips
// immediately. On error: dispatch the rollback to the snapshot taken
// before the call. On success: replace the slice with the server-truth
// `Card` payload.

import { useWallet } from '@/context/WalletContext';
import type { Card, FreezeRequest } from '@/types/card';
import { cardApi } from '@/utils/api/card';
import { CARD_QUERY_KEY } from './useCard';
import { useMutation, type MutationResult } from './useMutation';

interface CardEnvelope {
  card: Card | null;
}

export function useFreezeCard(): MutationResult<FreezeRequest, CardEnvelope> {
  const { state, dispatch } = useWallet();

  return useMutation<FreezeRequest, CardEnvelope>(
    async (vars, { idempotencyKey }) => {
      // Snapshot before the optimistic flip — captured here so each call
      // gets a fresh reference (the closure over state is stable per render
      // but mutation may run later).
      const snapshot = state.cardApi;
      dispatch({
        type: 'CARD/UPDATE_API_STATUS',
        payload: {
          lifecycleStatus: 'frozen',
          status: 'frozen',
          frozenAt: new Date().toISOString(),
        },
      });
      try {
        return await cardApi.freeze(vars, idempotencyKey);
      } catch (e) {
        // Rollback by writing the prior snapshot back.
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
      retry: 1,
      invalidateKeys: [CARD_QUERY_KEY],
      onSuccess: (response) => {
        dispatch({ type: 'CARD/SET_API', payload: response.card });
      },
    },
  );
}
