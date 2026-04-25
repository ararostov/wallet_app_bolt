// Payment-method domain types — mirror docs/api/specs/04-payment-methods.ru.md
// and OpenAPI components/schemas/payment-method.yaml. Wire shapes are
// camelCase, null-preserving (every optional field is always present, even
// when set to null).
//
// PSP scope: TrueLayer Open Banking is the sole top-up PSP. Card-channel
// (`adyen_*`) literals were removed per tech-debt §2.2. OpenAPI may still
// list legacy `adyen_*` enum members until backend prunes them — those
// values are dead on read (no new methods are created with them) and will
// not surface in the mobile app.
//
// `PaymentMethodType` retains `scheme | apple_pay | google_pay` so legacy
// stored methods (created when Adyen was live) can still be displayed for
// existing customers; only `open_banking` is creatable going forward.

export type PaymentMethodChannel = 'truelayer_open_banking';

export type PaymentMethodType =
  | 'scheme'
  | 'apple_pay'
  | 'google_pay'
  | 'open_banking';

export type PaymentMethodStatus = 'active' | 'disabled' | 'expired' | 'archived';

// TODO(tech-debt §2.2): backend may still return `adyen` for legacy stored
// methods until OpenAPI is pruned. Keep the literal here for read-time
// display; new methods created via the mobile app are always `truelayer`.
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

// POST /payment-methods request body. Strictly excludes raw card/banking
// credentials — only opaque tokens returned by TrueLayer's hosted consent
// page reach our backend.
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
