// Payment-method endpoint helpers.
// Contracts mirror docs/api/specs/04-payment-methods.ru.md and OpenAPI
// paths/payment-methods.yaml. Helpers return the unwrapped data envelope
// (handled by the api.ts response interceptor).
//
// SECURITY: `create()` enforces a runtime guard that the body never carries
// PAN-like fields. Bug in the mobile build → throw early instead of letting
// `PLAIN_PAN_FORBIDDEN` come back from the server.

import { api } from '../api';
import { logError } from '../logger';
import type {
  CreatePaymentMethodRequest,
  InitSessionRequest,
  InitSessionResponse,
  PaymentMethodArchivedResponse,
  PaymentMethodEnvelopeResponse,
  PaymentMethodListResponse,
} from '@/types/paymentMethods';

const FORBIDDEN_BODY_KEY_RE =
  /^(pan|cardNumber|number|cvv|cvc|securityCode|expiryMonth|expiryYear|expiry|pin|password)$/i;

function assertNoPanFields(obj: unknown, depth = 0): void {
  if (depth > 5 || !obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (FORBIDDEN_BODY_KEY_RE.test(key)) {
      const err = new Error(
        `Forbidden field '${key}' in POST /payment-methods body — this is a mobile build bug.`,
      );
      logError(err, { where: 'paymentMethodsApi.create' });
      throw err;
    }
    const value = (obj as Record<string, unknown>)[key];
    if (value && typeof value === 'object') {
      assertNoPanFields(value, depth + 1);
    }
  }
}

export const paymentMethodsApi = {
  list(params?: { includeArchived?: boolean }): Promise<PaymentMethodListResponse> {
    return api
      .get<PaymentMethodListResponse>('/payment-methods', { params })
      .then((r) => r.data);
  },

  initSession(payload: InitSessionRequest): Promise<InitSessionResponse> {
    return api
      .get<InitSessionResponse>('/payment-methods/init', { params: payload })
      .then((r) => r.data);
  },

  create(
    payload: CreatePaymentMethodRequest,
    idempotencyKey: string,
  ): Promise<PaymentMethodEnvelopeResponse> {
    assertNoPanFields(payload);
    return api
      .post<PaymentMethodEnvelopeResponse>('/payment-methods', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data);
  },

  setDefault(
    id: string,
    idempotencyKey: string,
  ): Promise<PaymentMethodEnvelopeResponse> {
    return api
      .patch<PaymentMethodEnvelopeResponse>(
        `/payment-methods/${encodeURIComponent(id)}/set-default`,
        {},
        { headers: { 'Idempotency-Key': idempotencyKey } },
      )
      .then((r) => r.data);
  },

  archive(
    id: string,
    idempotencyKey: string,
  ): Promise<PaymentMethodArchivedResponse> {
    return api
      .delete<PaymentMethodArchivedResponse>(
        `/payment-methods/${encodeURIComponent(id)}`,
        { headers: { 'Idempotency-Key': idempotencyKey } },
      )
      .then((r) => r.data);
  },
};
