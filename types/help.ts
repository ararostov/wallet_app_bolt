// Help & support domain types — aligned with docs/api/specs/10-help-legal.ru.md
// and the OpenAPI schemas at app/public/openapi/components/schemas/help-legal.yaml.
//
// Wire shape rules:
// - All IDs are strings (the project's bigint-as-string convention).
// - Dates are ISO 8601 UTC strings.
// - `category` is a free-form lowercase slug — backend does NOT enforce a closed
//   enum (see OpenAPI schema description). The mobile client receives the
//   distinct slug list via `meta.categories` and renders chips dynamically.
// - Closed enums are reserved for the support-ticket domain where the operator
//   workflow depends on a known set.

// FAQ category — backend is intentionally open ("^[a-z_-]+$"); we keep it as a
// branded string to make intent clear at call sites without losing extensibility.
export type FaqCategory = string;

// Compact FAQ row returned by GET /help/faqs.
export interface FaqListItem {
  id: string;
  category: FaqCategory;
  question: string;
  answerPreview: string;
  order: number;
  isPlatformWide: boolean;
  updatedAt: string;
}

// Full FAQ entry returned by GET /help/faqs/{id}.
export interface Faq {
  id: string;
  category: FaqCategory;
  question: string;
  answerMarkdown: string;
  order: number;
  locale: string;
  isPlatformWide: boolean;
  updatedAt: string;
}

// Pagination meta for cursor-paginated FAQ list.
export interface FaqListPagination {
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

// FAQ list meta (envelope's meta block) — exposes distinct categories so the
// mobile client can render filter chips without a hardcoded list.
export interface FaqListMeta {
  requestId?: string;
  timestamp?: string;
  categories?: string[];
  pagination?: FaqListPagination;
}

// Short store representation embedded inside the support-contact response.
// Distinct from `Store` (the full record returned by GET /stores) — keeps the
// support-contact payload small for the "Visit us in store" card.
export interface SupportContactStore {
  id: string;
  name: string;
  city: string;
  countryCode: string;
}

// Support contact block returned by GET /support/contact.
// Each scalar can be `null` when the merchant has not configured it; the UI
// hides the matching row gracefully.
export interface SupportContact {
  email: string | null;
  phone: string | null;
  hours: string | null;
  url: string | null;
  stores: SupportContactStore[];
}

// Closed enum — backend uses it to route operator queues.
export type SupportTicketCategory =
  | 'account'
  | 'payment'
  | 'card'
  | 'transaction'
  | 'general'
  | 'other';

// Closed enum — lifecycle stage of the ticket.
export type SupportTicketStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'closed';

// Closed enum — priority hint. MVP always sends `normal`.
export type SupportTicketPriority = 'low' | 'normal' | 'high';

// Diagnostic context the mobile client sends with the ticket. Backend persists
// only these whitelisted keys; anything else is silently dropped.
export interface SupportTicketMetadata {
  deviceId?: string;
  appVersion?: string;
  platform?: 'ios' | 'android';
  osVersion?: string;
}

// POST /support/ticket request body.
export interface CreateSupportTicketRequest {
  subject: string;
  category: SupportTicketCategory;
  body: string;
  priority?: SupportTicketPriority;
  metadata?: SupportTicketMetadata;
}

// POST /support/ticket response — newly created ticket.
export interface SupportTicket {
  id: string;
  reference: string; // matches `^TKT-[0-9]{8}$`
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  createdAt: string;
}
