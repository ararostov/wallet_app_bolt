// useAddToGoogleWallet — POST /card/add-to-google-wallet.
// Mirrors the Apple variant: opaque activation bundle, MVP redirect-stub.

import { useWallet } from '@/context/WalletContext';
import type { AddToWalletRequest, WalletProvisioningResult } from '@/types/card';
import { cardApi } from '@/utils/api/card';
import { useMutation, type MutationResult } from './useMutation';

export function useAddToGoogleWallet(): MutationResult<
  AddToWalletRequest,
  WalletProvisioningResult
> {
  const { dispatch } = useWallet();

  return useMutation<AddToWalletRequest, WalletProvisioningResult>(
    (vars, { idempotencyKey }) =>
      cardApi.addToGoogleWallet(vars, idempotencyKey),
    {
      retry: 0,
      onSuccess: () => {
        dispatch({
          type: 'CARD/SET_PROVISIONING_STATUS',
          payload: { provider: 'google_wallet', status: 'instructions_received' },
        });
      },
      onError: () => {
        dispatch({
          type: 'CARD/SET_PROVISIONING_STATUS',
          payload: { provider: 'google_wallet', status: 'failed' },
        });
      },
    },
  );
}
