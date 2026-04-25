// Concurrent-safe access-token refresh.
// If multiple requests fail with 401 simultaneously, only one refresh
// network call is made; the others await the same promise.
//
// This module deliberately avoids importing from `./api/auth` and
// `./api` to break the dependency cycle: it talks to the refresh
// endpoint via a plain fetch using the same baseURL the api client uses.

import { TokenStorage } from './tokens';

type RefreshResponseEnvelope = {
  data?: {
    accessToken?: string;
    refreshToken?: string;
  };
  errors?: { code?: string; message?: string };
};

function getBaseUrl(): string {
  const root = process.env.EXPO_PUBLIC_API_URL ?? '';
  const version = process.env.EXPO_PUBLIC_API_VERSION ?? 'v1';
  return `${root.replace(/\/$/, '')}/api/${version}`;
}

class AuthQueueImpl {
  private pending: Promise<void> | null = null;

  async refresh(): Promise<void> {
    if (this.pending) return this.pending;
    this.pending = this.doRefresh();
    try {
      await this.pending;
    } finally {
      this.pending = null;
    }
  }

  private async doRefresh(): Promise<void> {
    const { refresh } = await TokenStorage.get();
    if (!refresh) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${getBaseUrl()}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refreshToken: refresh }),
    });

    if (!response.ok) {
      throw new Error(`Refresh failed with status ${response.status}`);
    }

    const body = (await response.json()) as RefreshResponseEnvelope;
    const accessToken = body?.data?.accessToken;
    const refreshToken = body?.data?.refreshToken;
    if (!accessToken || !refreshToken) {
      throw new Error('Refresh response missing tokens');
    }

    await TokenStorage.set({ access: accessToken, refresh: refreshToken });
  }
}

export const AuthQueue = new AuthQueueImpl();
