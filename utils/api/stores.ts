// Store-locator endpoint helper. Mirrors GET /stores in
// docs/api/specs/10-help-legal.ru.md / app/public/openapi/paths/help-legal.yaml.
//
// Public endpoint — only X-Merchant-Code is required (bearer is optional).

import { api } from '../api';
import type { Store, StoreListMeta } from '@/types/stores';

export interface ListStoresParams {
  city?: string;
  cursor?: string;
  limit?: number;
}

export interface ListStoresResult {
  data: Store[];
  meta: StoreListMeta;
}

export const storesApi = {
  list(params: ListStoresParams = {}): Promise<ListStoresResult> {
    return api
      .get<Store[]>('/stores', { params })
      .then((r) => ({
        data: r.data,
        meta: ((r as unknown) as { meta?: StoreListMeta }).meta ?? {},
      }));
  },
};
