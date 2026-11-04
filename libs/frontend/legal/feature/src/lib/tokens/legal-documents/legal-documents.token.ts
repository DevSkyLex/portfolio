import { InjectionToken } from '@angular/core';
import type { LegalDocumentSource } from '@internal/legal-web-feature/lib/models/legal-document/legal-document-source.interface';

/**
 * Constant LEGAL_DOCUMENTS
 *
 * @description
 * Source of the legal documents, provided by the shell over the content snapshot; the pages fail
 * loudly without it rather than render an empty legal page.
 */
export const LEGAL_DOCUMENTS: InjectionToken<LegalDocumentSource> =
  new InjectionToken<LegalDocumentSource>('LEGAL_DOCUMENTS');
