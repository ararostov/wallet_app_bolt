// Legal-document domain types — aligned with docs/api/specs/10-help-legal.ru.md
// and the OpenAPI schema in app/public/openapi/components/schemas/help-legal.yaml.
//
// Backend serves IDs as strings (the project's bigint-as-string convention),
// even though the auth `consentedDocumentIds` payload expects integers — the
// caller converts via Number(id) at the registration boundary.

// Closed enum mirroring `MerchantLegalDocumentType` on the backend (see
// `LegalDocumentType` in components/schemas/help-legal.yaml).
export type LegalDocumentType =
  | 'terms_of_service'
  | 'privacy_policy'
  | 'rewards_terms'
  | 'cookie_policy';

// Compact list row returned by GET /legal/documents.
// Body (`contentMarkdown`) is intentionally absent — fetch the detail
// endpoint when the user opens a specific document.
export interface LegalDocumentListItem {
  id: string;
  type: LegalDocumentType;
  title: string;
  slug: string;
  version: string;
  url: string | null;
  publishedAt: string; // ISO 8601 UTC
  required: boolean;
}

// Full document returned by GET /legal/documents/{id}. Exactly one of
// `contentMarkdown` and `url` is the authoritative source for rendering:
// - `contentMarkdown` non-null  → render in-app via Markdown.
// - `contentMarkdown` null      → open `url` in an external browser.
export interface LegalDocument extends LegalDocumentListItem {
  contentMarkdown: string | null;
}
