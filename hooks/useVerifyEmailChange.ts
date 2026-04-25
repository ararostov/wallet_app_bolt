// useVerifyEmailChange — POST /user/contact/email/verify.
// On 200 the backend returns the refreshed full profile.

import { useWallet } from '@/context/WalletContext';
import { profileApi } from '@/utils/api/profile';
import { useMutation } from './useMutation';
import type {
  ContactChangeVerifyRequest,
  UserProfile,
} from '@/types/profile';

export function useVerifyEmailChange() {
  const { dispatch } = useWallet();

  return useMutation<ContactChangeVerifyRequest, UserProfile>(
    (vars) => profileApi.verifyEmailChange(vars),
    {
      retry: 1,
      invalidateKeys: ['profile/me', 'contact-details'],
      onSuccess: (data) => {
        dispatch({
          type: 'UPDATE_USER',
          payload: {
            email: data.email ?? '',
            emailVerified: data.emailVerified,
          },
        });
        dispatch({ type: 'CONTACT_CHANGE/COMPLETE' });
      },
    },
  );
}
