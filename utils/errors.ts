// API and network error types + error-code → user-facing message mapping.
// Seed messages cover spec 00-auth and adjacent commonly used codes.

export type ApiErrorParams = {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(params: ApiErrorParams) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
    this.requestId = params.requestId;
  }

  isValidation(): boolean {
    return this.status === 422;
  }
  isUnauthorized(): boolean {
    return this.status === 401;
  }
  isForbidden(): boolean {
    return this.status === 403;
  }
  isConflict(): boolean {
    return this.status === 409;
  }
  isRateLimit(): boolean {
    return this.status === 429;
  }
  isServer(): boolean {
    return this.status >= 500;
  }
}

export class NetworkError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'NetworkError';
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  // Auth (00-auth)
  INVALID_VERIFICATION_CODE: 'The code is incorrect. Please try again.',
  VERIFICATION_CODE_EXPIRED: 'The code has expired. Request a new one.',
  TOO_MANY_VERIFICATION_ATTEMPTS: 'Too many attempts. Please wait and try later.',
  CUSTOMER_ALREADY_REGISTERED: 'An account with this contact already exists. Log in instead.',
  INVALID_CREDENTIALS: 'Incorrect credentials.',
  UNDERAGE_CUSTOMER: 'You must be at least 18 years old to register.',
  PASSWORD_NOT_SET: 'Please use the one-time code to log in.',
  CUSTOMER_NOT_FOUND: 'We could not find an account with these details.',
  INVALID_REFRESH_TOKEN: 'Your session has expired. Please log in again.',
  REFRESH_TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  PASSWORD_RESET_CODE_INVALID: 'The reset code is incorrect.',
  PASSWORD_RESET_CODE_EXPIRED: 'The reset code has expired. Request a new one.',
  WEAK_PASSWORD: 'Password is too weak. Use at least 8 characters with letters and numbers.',
  PASSWORD_SAME_AS_CURRENT: 'New password must differ from current.',
  INVALID_CURRENT_PASSWORD: 'The current password is incorrect.',
  NO_ACTIVE_WALLET_PROGRAM: "We can't set up your wallet right now. Please contact support.",
  CUSTOMER_SUSPENDED: 'Your account is temporarily suspended. Please contact support.',
  CUSTOMER_BLOCKED: 'Your account has been blocked. Please contact support.',
  CUSTOMER_CLOSED: 'This account has been closed.',

  // Profile (01-profile)
  DATE_OF_BIRTH_ALREADY_SET:
    'Your date of birth cannot be changed. Contact support for assistance.',
  MANDATORY_CONSENT_REQUIRED: 'This consent is required to use the service.',
  LEGAL_DOCUMENT_NOT_FOUND: 'This document is no longer available.',
  ACCOUNT_DELETION_ALREADY_REQUESTED:
    'Your account is already scheduled for deletion.',
  ACCOUNT_HAS_POSITIVE_BALANCE:
    'Withdraw your balance before deleting your account.',
  ACCOUNT_HAS_ACTIVE_CARD:
    'Freeze and close your card before deleting your account.',
  CONTACT_CHANGE_ALREADY_PENDING:
    'You already have a pending contact change. Finish or cancel it first.',
  CONTACT_IDENTIFIER_ALREADY_TAKEN: 'This address is already in use.',
  CONTACT_IDENTIFIER_SAME_AS_CURRENT: 'Enter a different value.',

  // Wallet
  BALANCE_CEILING_EXCEEDED: 'Top-up exceeds your balance limit.',
  TOPUP_DAILY_LIMIT_EXCEEDED: 'Daily top-up limit reached.',
  TOPUP_MONTHLY_LIMIT_EXCEEDED: 'Monthly top-up limit reached.',
  TOPUP_BALANCE_CEILING_EXCEEDED: 'Top-up would exceed your balance limit.',
  INSUFFICIENT_FUNDS: 'Insufficient funds.',
  INSUFFICIENT_LIMIT_AVAILABLE: 'Your account limit is not sufficient.',
  AMOUNT_TOO_SMALL: 'Amount is below the minimum.',
  AMOUNT_TOO_LARGE: 'Amount exceeds the maximum allowed.',
  WALLET_FROZEN: 'Your wallet is frozen. Contact support.',
  WALLET_NOT_FOUND: 'Wallet not found.',

  // Top-up (05-topup) — codes that don't already appear in the Wallet/PSP
  // sections above. Names are taken verbatim from
  // app/public/openapi/paths/topup.yaml.
  RETURN_URL_NOT_ALLOWED:
    'This return URL is not allowed. Please update the app and try again.',
  PAYMENT_ORDER_NOT_FOUND: "We can't find this top-up request.",

  // Auto-reload (02-wallet)
  AUTO_RELOAD_INVALID_THRESHOLD:
    'Top-up amount must be greater than the trigger balance.',
  AUTO_RELOAD_INVALID_AMOUNT: 'Top-up amount is outside the allowed range.',
  AUTO_RELOAD_AMOUNT_INVALID: 'Top-up amount is outside the allowed range.',
  AUTO_RELOAD_PAYMENT_METHOD_REQUIRED: 'Select a payment method.',
  AUTO_RELOAD_PAYMENT_METHOD_INVALID:
    'This payment method is no longer available.',
  AUTO_RELOAD_CURRENCY_MISMATCH:
    'This payment method uses a different currency.',
  AUTO_RELOAD_LIMIT_EXCEEDED: 'Limits exceed program defaults.',
  AUTO_RELOAD_DAILY_CAP_INVALID:
    'Daily cap must be at least the reload amount.',
  AUTO_RELOAD_MONTHLY_CAP_INVALID:
    'Monthly cap must be at least the daily cap.',

  // Card
  CARD_INVALID_PIN: 'Incorrect PIN. Please try again.',
  CARD_PIN_LOCKED: 'Card was locked after too many PIN attempts. Contact support.',
  CARD_LIMIT_CURRENCY_MISMATCH: 'Limit currency must match your wallet.',
  CARD_ALREADY_FROZEN: 'This card is already frozen.',
  CARD_NOT_FROZEN: 'This card is not frozen.',
  CARD_NOT_ACTIVE: 'This card is not active.',
  CARD_FROZEN: 'This card is frozen.',
  CARD_CLOSED: 'This card has been closed.',
  CARD_NOT_FOUND: 'Card not found.',
  CARD_ISSUANCE_IN_PROGRESS: 'Your card is being issued. Please wait.',
  CARD_ISSUANCE_FAILED: 'Card issuance failed. Please try again.',
  CARD_ALREADY_ISSUED: 'You already have an active card.',
  CARD_LIMIT_OUT_OF_RANGE: 'Limit value is outside the allowed range.',
  CARD_LIMIT_INVALID_HIERARCHY: 'Daily limit cannot exceed monthly limit.',
  CARD_PROVIDER_REJECTED: 'Card provider rejected the request.',
  CARD_PRODUCT_UNAVAILABLE: 'No card product available for this program.',
  WALLET_PROVISIONING_NOT_SUPPORTED: 'Mobile wallet provisioning is not supported.',
  WALLET_PROVISIONING_ALREADY_ACTIVE: 'Card already provisioned to this device.',

  // Payment / PSP
  PSP_PROVIDER_DECLINED: 'Payment was declined by the provider. Try another method.',
  PSP_PROVIDER_UNAVAILABLE: 'Payment provider is temporarily unavailable.',
  PSP_PROVIDER_TIMEOUT: 'Payment provider did not respond. Please try again.',
  PAYMENT_METHOD_NOT_FOUND: 'Payment method not found.',
  PAYMENT_METHOD_INACTIVE: 'This payment method is not active.',
  PAYMENT_METHOD_CURRENCY_MISMATCH: 'Payment method currency does not match.',
  PAYMENT_METHOD_INVALID_TOKEN: 'Payment session is invalid. Please retry.',
  PAYMENT_METHOD_DUPLICATE_TOKEN: 'This payment method is already saved.',
  PAYMENT_METHOD_BRAND_UNSUPPORTED: 'This card brand is not supported.',
  PAYMENT_METHOD_ATTACHED_TO_AUTO_RELOAD:
    'Remove this card from auto-reload before deleting it.',
  PAYMENT_METHOD_ALREADY_ARCHIVED: 'This payment method has already been removed.',
  PAYMENT_METHOD_NOT_ACTIVE:
    "This method isn't active. Please add a new one.",
  PAYMENT_METHOD_TYPE_UNSUPPORTED:
    "This payment method isn't available right now.",
  PAYMENT_METHOD_OWNERSHIP_MISMATCH:
    'Something went wrong. Please re-open the app.',
  PAYMENT_METHOD_PROVIDER_UNAVAILABLE:
    'Payment provider is temporarily unavailable. Please try again.',
  PSP_SESSION_EXPIRED: 'The payment session expired. Please try again.',
  PSP_SESSION_INVALID: 'The payment session is invalid. Please try again.',
  PLAIN_PAN_FORBIDDEN: 'Card details cannot be entered directly. Use a secure provider.',

  // Generic
  VALIDATION_FAILED: 'Please check the fields and try again.',
  IDEMPOTENCY_KEY_IN_PROGRESS: 'A similar request is still being processed.',
  IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD:
    'A request with the same key but different content is in progress.',
  IDEMPOTENCY_KEY_MISSING: 'Missing idempotency key.',
  RATE_LIMITED: 'Too many requests. Please slow down.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please slow down.',
  INTERNAL_ERROR: 'Something went wrong on our side. Please try again.',
  SERVER_ERROR: 'Something went wrong on our side. Please try again.',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable.',
  PROVIDER_ERROR: 'A provider error occurred. Please try again.',
  UNAUTHORIZED: 'Please log in to continue.',
  FORBIDDEN: 'You do not have access to this resource.',
  NOT_FOUND: 'Not found.',
  MERCHANT_CODE_MISSING: 'Application configuration error.',
  MERCHANT_NOT_FOUND: 'Application configuration error.',
  MERCHANT_INACTIVE: 'This merchant is not currently available.',
};

export function mapErrorCode(code: string): string | null {
  return ERROR_MESSAGES[code] ?? null;
}
