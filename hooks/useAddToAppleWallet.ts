// useAddToAppleWallet — POST /card/add-to-apple-wallet.
//
// Returns the opaque `ProvisioningInstructions` payload. The MVP does not
// integrate native PassKit (Expo managed workflow); the caller decides
// what to do with the response — see Card tab for the redirect / placeholder
// flow. `activationData` MUST NEVER be persisted or logged.

import { useWallet } from '@/context/WalletContext';
import type { AddToWalletRequest, WalletProvisioningResult } from '@/types/card';
import { cardApi } from '@/utils/api/card';
import { useMutation, type MutationResult } from './useMutation';

export function useAddToAppleWallet(): MutationResult<
  AddToWalletRequest,
  WalletProvisioningResult
> {
  const { dispatch } = useWallet();

  return useMutation<AddToWalletRequest, WalletProvisioningResult>(
    (vars, { idempotencyKey }) =>
      cardApi.addToAppleWallet(vars, idempotencyKey),
    {
      retry: 0,
      onSuccess: () => {
        dispatch({
          type: 'CARD/SET_PROVISIONING_STATUS',
          payload: { provider: 'apple_wallet', status: 'instructions_received' },
        });
      },
      onError: () => {
        dispatch({
          type: 'CARD/SET_PROVISIONING_STATUS',
          payload: { provider: 'apple_wallet', status: 'failed' },
        });
      },
    },
  );
}
