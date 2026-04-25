// useSupportContact — GET /support/contact.
//
// Embeds the top-3 stores by default (matches "Visit us in store" card from
// spec §4.3). City filter is optional — when present, backend filters the
// embedded stores to that city.

import { useMemo } from 'react';

import type { SupportContact } from '@/types/help';
import { helpApi } from '@/utils/api/help';
import { useQuery, type QueryResult } from './useQuery';

export interface UseSupportContactOptions {
  city?: string;
  includeStores?: boolean;
  storeLimit?: number;
  enabled?: boolean;
}

const TTL_MS = 5 * 60 * 1000;
const STALE_MS = 60 * 1000;

export function useSupportContact(
  options: UseSupportContactOptions = {},
): QueryResult<SupportContact> {
  const { city, includeStores = true, storeLimit = 3, enabled = true } = options;
  const key = useMemo(
    () => `support:contact:${city ?? ''}:${includeStores ? '1' : '0'}:${storeLimit}`,
    [city, includeStores, storeLimit],
  );

  return useQuery<SupportContact>(
    key,
    async () => {
      const data = await helpApi.getContact({ city, includeStores, storeLimit });
      return { data };
    },
    { enabled, ttlMs: TTL_MS, staleMs: STALE_MS, refetchOnFocus: true },
  );
}
