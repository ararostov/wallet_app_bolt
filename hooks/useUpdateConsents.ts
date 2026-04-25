// useUpdateConsents — wraps PATCH /user/consents.
// Submits the full consent map (mandatory + optional) as required by the
// backend. On success replaces the consent slice with the refreshed payload.

import { useWallet } from '@/context/WalletContext';
import { profileApi } from '@/utils/api/profile';
import { haptics } from '@/utils/haptics';
import { useMutation } from './useMutation';
import type {
  ConsentsStatusResponse,
  UpdateConsentsRequest,
} from '@/types/profile';

export function useUpdateConsents() {
  const { dispatch } = useWallet();

  return useMutation<UpdateConsentsRequest, ConsentsStatusResponse>(
    (vars) => profileApi.updateConsents(vars),
    {
      retry: 1,
      invalidateKeys: ['consents'],
      onSuccess: (data) => {
        dispatch({
          type: 'CONSENTS/SET',
          payload: { documents: data.documents, marketingOptIn: data.marketingOptIn },
        });
        dispatch({ type: 'UPDATE_USER', payload: { marketingOptIn: data.marketingOptIn } });
        haptics.success();
      },
    },
  );
}
