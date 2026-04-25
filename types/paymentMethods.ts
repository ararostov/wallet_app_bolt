// Payment-method domain types — mirror docs/api/specs/04-payment-methods.ru.md
// and OpenAPI components/schemas/payment-method.yaml. Wire shapes are
// camelCase, null-preserving (every optional field is always present, even
// when set to null).

export type PaymentMethodChannel =
  | 'adyen_card'
  | 'adyen_apple_pay'
  | 'adyen_google_pay'
  | 'truelayer_open_banking';

export type PaymentMethodType =
  | 'scheme'
  | 'apple_pay'
  | 'google_pay'
  | 'open_banking';

export type PaymentMethodStatus = 'active' | 'disabled' | 'expired' | 'archived';

export type PaymentMethodProvider =
  | 'adyen'
  | 'truelayer'
  | 'thredd'
  | 'moorwand';

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  provider: PaymentMethodProvider;
  status: PaymentMethodStatus;
  brand: string | null;
  panLast4: string | null;
  bankName: string | null;
  bankLogoUrl: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  ownerName: string | null;
  isDefault: boolean;
  storedAt: string | null;
}

// GET /payment-methods/init — flat null-preserving response.
export interface InitSessionRequest {
  channel: PaymentMethodChannel;
  returnUrl?: string;
  locale?: string;
}

export interface InitSessionResponse {
  channel: PaymentMethodChannel;
  sessionId: string;
  sessionData: string | null;
  clientKey: string | null;
  publicKey: string | null;
  authorizationUrl: string | null;
  returnUrl: string | null;
  merchantIdentifier: string | null;
  gatewayMerchantId: string | null;
  hostedPaymentPageUrl?: string | null;
  supportedNetworks: string[];
  expiresAt: string;
}

// GET /payment-methods response payload.
export interface PaymentMethodListResponse {
  paymentMethods: PaymentMethod[];
  defaultPaymentMethodId: string | null;
}

// POST /payment-methods request body. Strictly excludes raw card fields.
export interface CreatePaymentMethodRequest {
  channel: PaymentMethodChannel;
  pspToken: string;
  pspSessionId?: string | null;
  trueLayerAccountId?: string | null;
  setAsDefault?: boolean;
}

// POST /payment-methods + PATCH /payment-methods/{id}/set-default response payload.
export interface PaymentMethodEnvelopeResponse {
  paymentMethod: PaymentMethod;
}

// DELETE /payment-methods/{id} response payload.
export interface PaymentMethodArchivedResponse {
  archivedPaymentMethodId: string;
  newDefaultPaymentMethodId: string | null;
}
