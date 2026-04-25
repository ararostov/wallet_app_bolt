// Single axios instance for the mobile app.
// - Adds Authorization, X-Request-Id, X-Merchant-Code (when configured) headers.
// - Unwraps {data, meta} envelope so call sites get the payload directly.
// - On 401: attempts coordinated refresh via AuthQueue, retries once,
//   else fires AuthEvents.emit('logout') and throws.
// - Normalises all transport/HTTP errors into ApiError / NetworkError.

import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { v4 as uuidv4 } from 'uuid';

import { AuthEvents } from './authEvents';
import { AuthQueue } from './authQueue';
import { ApiError, NetworkError, mapErrorCode } from './errors';
import { TokenStorage } from './tokens';

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

type ErrorEnvelope = {
  errors?: {
    code?: string;
    message?: string;
    fields?: Record<string, string[]>;
    details?: unknown;
  };
};

type SuccessEnvelope<T> = {
  data: T;
  meta?: unknown;
};

const DEFAULT_TIMEOUT_MS = 15000;

const baseURL = (() => {
  const root = process.env.EXPO_PUBLIC_API_URL ?? '';
  const version = process.env.EXPO_PUBLIC_API_VERSION ?? 'v1';
  return `${root.replace(/\/$/, '')}/api/${version}`;
})();

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Client-Platform': 'mobile',
  },
});

// --- Request interceptor: token + correlation id -----------------------------

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const headers = AxiosHeaders.from(config.headers ?? {});
  headers.set('X-Request-Id', uuidv4());

  const url = config.url ?? '';
  // Auth endpoints (send-otp, verify-*, register, refresh-token, logout)
  // are sent without bearer; refresh has its own flow in AuthQueue.
  const isAuthEndpoint = url.startsWith('/auth/');
  if (!isAuthEndpoint) {
    const tokens = await TokenStorage.get();
    if (tokens.access) {
      headers.set('Authorization', `Bearer ${tokens.access}`);
    }
  }

  // X-Merchant-Code is required by backend on /api/v1/*. The merchant code
  // can be supplied via env until per-merchant resolution exists.
  const merchantCode = process.env.EXPO_PUBLIC_MERCHANT_CODE;
  if (merchantCode && !headers.has('X-Merchant-Code')) {
    headers.set('X-Merchant-Code', merchantCode);
  }

  config.headers = headers;
  return config;
});

// --- Response interceptor: envelope unwrap + 401 refresh + errors ------------

function unwrapEnvelope<T>(response: AxiosResponse): AxiosResponse<T> {
  const body = response.data as unknown;
  if (body && typeof body === 'object' && 'data' in (body as Record<string, unknown>)) {
    const envelope = body as SuccessEnvelope<T>;
    response.data = envelope.data;
    // Attach meta for hooks that want pagination/etc.
    (response as AxiosResponse<T> & { meta?: unknown }).meta = envelope.meta;
  }
  return response as AxiosResponse<T>;
}

function normaliseError(error: AxiosError): Error {
  if (!error.response) {
    return new NetworkError('Network request failed', { cause: error });
  }

  const status = error.response.status;
  const body = (error.response.data ?? {}) as ErrorEnvelope;
  const code = body.errors?.code ?? `HTTP_${status}`;
  const message =
    mapErrorCode(code) ??
    body.errors?.message ??
    'Something went wrong. Please try again.';

  const requestIdHeader = error.config?.headers?.['X-Request-Id'];
  const requestId =
    typeof requestIdHeader === 'string' ? requestIdHeader : undefined;

  return new ApiError({
    status,
    code,
    message,
    details: body.errors?.details ?? body.errors?.fields,
    requestId,
  });
}

api.interceptors.response.use(
  (response) => unwrapEnvelope(response),
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    // 401 → try one coordinated refresh and retry once.
    const url = original?.url ?? '';
    const isRefreshCall = url.includes('/auth/refresh-token');
    if (status === 401 && original && !original._retry && !isRefreshCall) {
      original._retry = true;
      try {
        await AuthQueue.refresh();
        const tokens = await TokenStorage.get();
        if (tokens.access) {
          const retryHeaders = AxiosHeaders.from(original.headers ?? {});
          retryHeaders.set('Authorization', `Bearer ${tokens.access}`);
          original.headers = retryHeaders;
        }
        return api(original);
      } catch {
        await TokenStorage.clear();
        AuthEvents.emit('logout');
        throw normaliseError(error);
      }
    }

    throw normaliseError(error);
  },
);

// --- Retry helper for write ops (used by useMutation) -----------------------

export async function retryableRequest<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (e instanceof ApiError && [429, 502, 503, 504].includes(e.status)) {
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** i));
        continue;
      }
      throw e;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('retryableRequest exhausted');
}
