// Lightweight logger that strips sensitive fields before output.
// Replace with Sentry / analytics SDK after MVP.

const SENSITIVE_KEYS = new Set<string>([
  'password',
  'currentPassword',
  'newPassword',
  'otp',
  'code',
  'verificationCode',
  'accessToken',
  'refreshToken',
  'token',
  'access_token',
  'refresh_token',
  'pan',
  'cardNumber',
  'cvv',
  'cvc',
  'securityCode',
  'pspToken',
  'pspSessionId',
  'trueLayerAccountId',
  'authorization',
  // PII fields persisted in the encrypted signup draft. `email` is left
  // unmasked because half the auth/profile telemetry keys off it; the rest
  // are unambiguous personal data and should never appear in logs.
  'firstName',
  'lastName',
  'dateOfBirth',
  'phoneE164',
]);

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[Truncated]';
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase())) {
      out[key] = '[REDACTED]';
      continue;
    }
    out[key] = sanitize(val, depth + 1);
  }
  return out;
}

export function logDebug(message: string, context?: Record<string, unknown>): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[DEBUG] ${message}`, context ? sanitize(context) : '');
  }
}

export function logError(error: unknown, context?: Record<string, unknown>): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error('[ERROR]', error, context ? sanitize(context) : '');
  }
  // TODO: send to Sentry / Crashlytics in production.
}

export function logEvent(name: string, props?: Record<string, unknown>): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[EVENT] ${name}`, props ? sanitize(props) : '');
  }
  // TODO: forward to analytics SDK in production.
}
