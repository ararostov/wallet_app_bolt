// useInitPaymentMethodSession — wraps GET /payment-methods/init.
//
// Called from the add screen state machine. Read-only on the server, but
// modelled as a mutation here because each tap on the channel choice opens
// a brand-new PSP session (idempotency key would be wrong).

import type {
  InitSessionRequest,
  InitSessionResponse,
} from '@/types/paymentMethods';
import { paymentMethodsApi } from '@/utils/api/paymentMethods';
import { useMutation, type MutationResult } from './useMutation';

export function useInitPaymentMethodSession(): MutationResult<
  InitSessionRequest,
  InitSessionResponse
> {
  return useMutation<InitSessionRequest, InitSessionResponse>(
    (vars) => paymentMethodsApi.initSession(vars),
    { retry: 1 },
  );
}
