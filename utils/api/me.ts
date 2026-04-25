// /me endpoint helper. Returns the customer profile + wallet summary
// for the currently authenticated user.

import { api } from '../api';
import type { MeResponse } from '@/types/auth';

export const meApi = {
  get(): Promise<MeResponse> {
    return api.get<MeResponse>('/me').then((r) => r.data);
  },
};
