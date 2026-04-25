// Legal-document endpoints (slice of spec 10 needed by the registration flow).
// Contracts mirror docs/api/specs/10-help-legal.ru.md and the OpenAPI source.
//
// Both endpoints are public (X-Merchant-Code only); api.ts already skips
// Authorization on /auth/* but still injects a bearer token here when one is
// available — backend treats it as optional, so this is fine.

import { api } from '../api';
import type { LegalDocument, LegalDocumentListItem, LegalDocumentType } from '@/types/legal';

export interface ListLegalDocumentsParams {
  type?: LegalDocumentType;
}

export const legalApi = {
  list(params: ListLegalDocumentsParams = {}): Promise<LegalDocumentListItem[]> {
    return api
      .get<LegalDocumentListItem[]>('/legal/documents', { params })
      .then((r) => r.data);
  },

  get(id: string): Promise<LegalDocument> {
    return api
      .get<LegalDocument>(`/legal/documents/${encodeURIComponent(id)}`)
      .then((r) => r.data);
  },
};
