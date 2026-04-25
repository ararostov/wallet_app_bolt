// Mutation hook for PATCH /wallet/auto-reload.
//
// - Required `Idempotency-Key` header generated once per modal session via
//   useMutation's internal ref (rotated on success).
// - Invalidates the cached /wallet/state response so the next focus refetch
//   reads fresh data; immediately also dispatches WALLET/SET_AUTO_RELOAD so
//   the UI doesn't need to wait for the network round-trip.

import { useWallet } from '@/context/WalletContext';
import type {
  UpdateAutoReloadRequest,
  UpdateAutoReloadResponse,
} from '@/types/wallet';
import { walletApi } from '@/utils/api/wallet';
import { useMutation, type MutationResult } from './useMutation';
import { WALLET_STATE_QUERY_KEY } from './useWalletState';

export type UseUpdateAutoReloadOptions = {
  onSuccess?: (response: UpdateAutoReloadResponse) => void;
  onError?: (error: Error) => void;
};

export function useUpdateAutoReload(
  options: UseUpdateAutoReloadOptions = {},
): MutationResult<UpdateAutoReloadRequest, UpdateAutoReloadResponse> {
  const { dispatch } = useWallet();

  return useMutation<UpdateAutoReloadRequest, UpdateAutoReloadResponse>(
    (vars, { idempotencyKey }) => walletApi.updateAutoReload(vars, idempotencyKey),
    {
      retry: 1,
      invalidateKeys: [WALLET_STATE_QUERY_KEY],
      onSuccess: (response) => {
        dispatch({ type: 'WALLET/SET_AUTO_RELOAD', payload: response.autoReload });
        options.onSuccess?.(response);
      },
      onError: (error) => options.onError?.(error),
    },
  );
}
