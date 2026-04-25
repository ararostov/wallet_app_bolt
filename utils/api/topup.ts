// Top-up endpoint helpers.
// Contracts mirror docs/api/specs/05-topup.ru.md and OpenAPI paths/topup.yaml.
// Helpers return the unwrapped data envelope (handled by api.ts interceptor).

import { api } from '../api';
import type {
  InitiateTopupRequest,
  TopupInitiationResponse,
  TopupStatusResponse,
} from '@/types/topup';

export const topupApi = {
  initiate(
    payload: InitiateTopupRequest,
    idempotencyKey: string,
  ): Promise<TopupInitiationResponse> {
    return api
      .post<TopupInitiationResponse>('/wallet/topup', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data);
  },

  getStatus(paymentOrderId: string): Promise<TopupStatusResponse> {
    return api
      .get<TopupStatusResponse>(
        `/wallet/topup-status/${encodeURIComponent(paymentOrderId)}`,
      )
      .then((r) => r.data);
  },
};
