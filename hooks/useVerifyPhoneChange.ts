// useVerifyPhoneChange — POST /user/contact/phone/verify.

import { useWallet } from '@/context/WalletContext';
import { profileApi } from '@/utils/api/profile';
import { useMutation } from './useMutation';
import type {
  ContactChangeVerifyRequest,
  UserProfile,
} from '@/types/profile';

export function useVerifyPhoneChange() {
  const { dispatch } = useWallet();

  return useMutation<ContactChangeVerifyRequest, UserProfile>(
    (vars) => profileApi.verifyPhoneChange(vars),
    {
      retry: 1,
      invalidateKeys: ['profile/me', 'contact-details'],
      onSuccess: (data) => {
        dispatch({
          type: 'UPDATE_USER',
          payload: {
            phone: data.phoneE164 ?? undefined,
            phoneE164: data.phoneE164 ?? undefined,
            phoneVerified: data.phoneVerified,
          },
        });
        dispatch({ type: 'CONTACT_CHANGE/COMPLETE' });
      },
    },
  );
}
