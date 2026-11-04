/**
 * Export LEGAL_ROUTES
 *
 * @description
 * Public route tree for the localized legal notice and privacy pages.
 */
export { LEGAL_ROUTES } from '@internal/legal-web-feature/lib/legal.routes';

/**
 * Export LEGAL_DOCUMENTS
 *
 * @description
 * Port of the legal documents, which the shell binds to the content snapshot (the legal context reads
 * no content library).
 */
export type { LegalDocumentSource } from '@internal/legal-web-feature/lib/models/legal-document/legal-document-source.interface';
export { LEGAL_DOCUMENTS } from '@internal/legal-web-feature/lib/tokens/legal-documents/legal-documents.token';

/**
 * Export COOKIE_PREFERENCES
 *
 * @description
 * Port of the cookie preferences, which the shell binds to its consent service (D48) so that the
 * privacy page offers « Gérer les cookies ».
 */
export type { CookiePreferences } from '@internal/legal-web-feature/lib/models/cookie-preferences/cookie-preferences.interface';
export { COOKIE_PREFERENCES } from '@internal/legal-web-feature/lib/tokens/cookie-preferences/cookie-preferences.token';
