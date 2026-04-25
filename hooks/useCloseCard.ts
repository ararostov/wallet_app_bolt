// useCloseCard — DELETE /card.
//
// On 204 the slice is cleared and the caller redirects to the empty-state
// card tab. Backend rate-limit is 3/hour so we never auto-retry on 429.

import { useWallet } from '@/context/WalletContext';
import type { CloseRequest } from '@/types/card';
import { cardApi } from '@/utils/api/card';
import { haptics } from '@/utils/haptics';
import { CARD_QUERY_KEY } from './useCard';
import { useMutation, type MutationResult } from './useMutation';

export function useCloseCard(): MutationResult<CloseRequest, void> {
  const { dispatch } = useWallet();

  return useMutation<CloseRequest, void>(
    (vars, { idempotencyKey }) => cardApi.close(vars, idempotencyKey),
    {
      retry: 0,
      invalidateKeys: [CARD_QUERY_KEY],
      onSuccess: () => {
        dispatch({ type: 'CARD/CLEAR' });
        // Destructive — surface a warning haptic per spec 4.5 §B.1.
        haptics.warning();
      },
    },
  );
}
