// Card endpoint helpers.
// Contracts mirror docs/api/specs/03-cards.ru.md and OpenAPI paths/cards.yaml.
// All helpers return the unwrapped data envelope (handled by api.ts).

import { api } from '../api';
import type {
  AddToWalletRequest,
  Card,
  CloseRequest,
  FreezeRequest,
  RequestIssuanceRequest,
  UnfreezeRequest,
  UpdateLimitsRequest,
  WalletProvisioningResult,
} from '@/types/card';

interface CardEnvelope {
  card: Card | null;
}

export const cardApi = {
  // GET /card — `card` is null when the customer has not been issued one
  // (this is not an error; mobile renders the empty state).
  get(): Promise<CardEnvelope> {
    return api.get<CardEnvelope>('/card').then((r) => r.data);
  },

  requestIssuance(
    body: RequestIssuanceRequest,
    idempotencyKey: string,
  ): Promise<CardEnvelope> {
    return api
      .post<CardEnvelope>('/card/request-issuance', body, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data);
  },

  freeze(body: FreezeRequest, idempotencyKey: string): Promise<CardEnvelope> {
    return api
      .patch<CardEnvelope>('/card/freeze', body, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data);
  },

  unfreeze(
    body: UnfreezeRequest,
    idempotencyKey: string,
  ): Promise<CardEnvelope> {
    return api
      .patch<CardEnvelope>('/card/unfreeze', body, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data);
  },

  // DELETE /card returns 204 (no body). The interceptor leaves data as
  // undefined when there is no envelope — we discard the response.
  close(body: CloseRequest, idempotencyKey: string): Promise<void> {
    return api
      .delete<void>('/card', {
        data: body,
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then(() => undefined);
  },

  updateLimits(
    body: UpdateLimitsRequest,
    idempotencyKey: string,
  ): Promise<CardEnvelope> {
    return api
      .patch<CardEnvelope>('/card/limits', body, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data);
  },

  addToAppleWallet(
    body: AddToWalletRequest,
    idempotencyKey: string,
  ): Promise<WalletProvisioningResult> {
    return api
      .post<WalletProvisioningResult>('/card/add-to-apple-wallet', body, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data);
  },

  addToGoogleWallet(
    body: AddToWalletRequest,
    idempotencyKey: string,
  ): Promise<WalletProvisioningResult> {
    return api
      .post<WalletProvisioningResult>('/card/add-to-google-wallet', body, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data);
  },
};
