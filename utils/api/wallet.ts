// Wallet endpoint helpers.
// Contracts mirror docs/api/specs/02-wallet.ru.md and OpenAPI paths/wallet.yaml.
// All helpers return the unwrapped data envelope (handled by api.ts interceptor).

import { api } from '../api';
import type {
  UpdateAutoReloadRequest,
  UpdateAutoReloadResponse,
  WalletBalance,
  WalletStateData,
  WalletStateInclude,
} from '@/types/wallet';

export const walletApi = {
  getBalance(): Promise<WalletBalance> {
    return api.get<WalletBalance>('/wallet/balance').then((r) => r.data);
  },

  getState(params?: { include?: WalletStateInclude[] }): Promise<WalletStateData> {
    const query =
      params?.include && params.include.length > 0
        ? { include: params.include.join(',') }
        : undefined;
    return api
      .get<WalletStateData>('/wallet/state', { params: query })
      .then((r) => r.data);
  },

  updateAutoReload(
    payload: UpdateAutoReloadRequest,
    idempotencyKey: string,
  ): Promise<UpdateAutoReloadResponse> {
    return api
      .patch<UpdateAutoReloadResponse>('/wallet/auto-reload', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data);
  },
};
