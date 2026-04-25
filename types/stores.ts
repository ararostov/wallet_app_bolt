// Store-locator domain types — aligned with docs/api/specs/10-help-legal.ru.md
// and the OpenAPI `MerchantStore` schema at
// app/public/openapi/components/schemas/help-legal.yaml.
//
// Geo fields (latitude/longitude) are NOT part of the MVP — clients filter by
// `?city` only. They are tracked in the spec's open questions and will be
// added once backend exposes them.

// Full active store record returned by GET /stores.
export interface Store {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  city: string;
  region: string | null;
  postalCode: string;
  addressLine1: string;
  addressLine2: string | null;
  timezone: string;
}

// Pagination meta for cursor-paginated GET /stores.
export interface StoreListPagination {
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface StoreListMeta {
  requestId?: string;
  timestamp?: string;
  pagination?: StoreListPagination;
}
