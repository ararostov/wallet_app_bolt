// Help & support endpoint helpers — covers FAQ list/detail, support contact,
// support ticket submission. Mirrors docs/api/specs/10-help-legal.ru.md and
// the OpenAPI source at app/public/openapi/paths/help-legal.yaml.
//
// Six of the seven help/legal endpoints are optional-auth (X-Merchant-Code is
// enough); the api.ts interceptor still injects the bearer when present which
// is fine — backend treats it as optional.
//
// `POST /support/ticket` is the lone authenticated write — it takes a caller-
// owned `Idempotency-Key` and the bearer token is mandatory.

import { api } from '../api';
import type {
  CreateSupportTicketRequest,
  Faq,
  FaqListItem,
  FaqListMeta,
  SupportContact,
  SupportTicket,
} from '@/types/help';

export interface ListFaqsParams {
  category?: string;
  q?: string;
  cursor?: string;
  limit?: number;
  locale?: string;
}

export interface ListFaqsResult {
  data: FaqListItem[];
  meta: FaqListMeta;
}

export interface GetSupportContactParams {
  city?: string;
  includeStores?: boolean;
  storeLimit?: number;
}

export const helpApi = {
  // List endpoint surfaces `meta.categories` so the UI can build chips without
  // a hardcoded list. Returns the raw envelope shape for that reason.
  listFaqs(params: ListFaqsParams = {}): Promise<ListFaqsResult> {
    return api
      .get<FaqListItem[]>('/help/faqs', { params })
      .then((r) => ({
        data: r.data,
        meta: ((r as unknown) as { meta?: FaqListMeta }).meta ?? {},
      }));
  },

  getFaq(id: string): Promise<Faq> {
    return api
      .get<Faq>(`/help/faqs/${encodeURIComponent(id)}`)
      .then((r) => r.data);
  },

  getContact(params: GetSupportContactParams = {}): Promise<SupportContact> {
    return api
      .get<SupportContact>('/support/contact', { params })
      .then((r) => r.data);
  },

  // Caller owns the idempotency key (rotated on conflict, reused on retry).
  submitTicket(
    payload: CreateSupportTicketRequest,
    idempotencyKey: string,
  ): Promise<SupportTicket> {
    return api
      .post<SupportTicket>('/support/ticket', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data);
  },
};
