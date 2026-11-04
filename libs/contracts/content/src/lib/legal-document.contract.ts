import { z } from 'zod/mini';
import {
  EditableArticleDocumentSchema,
  PublicArticleDocumentSchema,
} from '@internal/content-contracts/lib/article-document.contract';

/**
 * Constant LegalDocumentKindSchema
 *
 * @description
 * The two legal documents of the site, also the `:kind` segment of their administration routes: the
 * legal notice (`/legal-notice`: publisher, host, contact) and the privacy policy (`/privacy`: data
 * collected, purposes, retention, cookies, rights).
 */
export const LegalDocumentKindSchema = z.enum(['notice', 'privacy']);

/**
 * Type LegalDocumentKindDto
 * @type LegalDocumentKindDto
 *
 * @description
 * Legal notice or privacy policy.
 */
export type LegalDocumentKindDto = z.infer<typeof LegalDocumentKindSchema>;

/**
 * Constant LegalBodySchema
 *
 * @description
 * Body of a legal document in one language: the article document subset of D40 without figures (a
 * legal page shows no uploaded image, so the media purge never needs to read it).
 */
const LegalBodySchema: typeof EditableArticleDocumentSchema = EditableArticleDocumentSchema.check(
  z.refine(
    (document: { content: readonly { type: string }[] }): boolean =>
      document.content.every((block: { type: string }): boolean => block.type !== 'figure'),
    { message: 'A legal document holds no image.' },
  ),
);

/**
 * Constant LegalDocumentRevisionRequestSchema
 *
 * @description
 * Body of `PUT /api/content/admin/legal/:kind`: the document per language. Both are required by the
 * service (`content.legal-document-incomplete` for an empty one), since the page is public at once;
 * the « Dernière mise à jour » date is set by the service on each save.
 */
export const LegalDocumentRevisionRequestSchema = z.object({
  body: z.object({ fr: LegalBodySchema, en: LegalBodySchema }),
});

/**
 * Type LegalDocumentRevisionRequest
 * @type LegalDocumentRevisionRequest
 *
 * @description
 * Validated legal document revision.
 */
export type LegalDocumentRevisionRequest = z.infer<typeof LegalDocumentRevisionRequestSchema>;

/**
 * Constant ISO_DATE
 *
 * @description
 * Calendar date as `YYYY-MM-DD`.
 */
const ISO_DATE: RegExp = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

/**
 * Constant AdminLegalDocumentDtoSchema
 *
 * @description
 * Legal document as the administration reads it: its kind, body per language, last save (an ISO
 * date-time) and version (also its `ETag`).
 */
export const AdminLegalDocumentDtoSchema = z.object({
  kind: LegalDocumentKindSchema,
  body: z.object({ fr: LegalBodySchema, en: LegalBodySchema }),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.int().check(z.minimum(1)),
});

/**
 * Type AdminLegalDocumentDto
 * @type AdminLegalDocumentDto
 *
 * @description
 * Administration legal document.
 */
export type AdminLegalDocumentDto = z.infer<typeof AdminLegalDocumentDtoSchema>;

/**
 * Constant PublicLegalDocumentSchema
 *
 * @description
 * Legal document of the snapshot locale: the date of its last save in Paris time (`YYYY-MM-DD`, shown
 * as « Dernière mise à jour ») and its document.
 */
export const PublicLegalDocumentSchema = z.object({
  updatedOn: z.string().check(z.regex(ISO_DATE)),
  document: PublicArticleDocumentSchema,
});

/**
 * Type PublicLegalDocumentDto
 * @type PublicLegalDocumentDto
 *
 * @description
 * Published legal document.
 */
export type PublicLegalDocumentDto = z.infer<typeof PublicLegalDocumentSchema>;

/**
 * Constant LegalDocumentsSchema
 *
 * @description
 * Both legal documents of the snapshot, by kind.
 */
export const LegalDocumentsSchema = z.object({
  notice: PublicLegalDocumentSchema,
  privacy: PublicLegalDocumentSchema,
});

/**
 * Type LegalDocumentsDto
 * @type LegalDocumentsDto
 *
 * @description
 * Published legal documents.
 */
export type LegalDocumentsDto = z.infer<typeof LegalDocumentsSchema>;

/**
 * Constant LEGAL_ERROR_CODES
 *
 * @description
 * Problem codes of the legal administration besides `request.invalid` (400) and
 * `request.precondition-required` (428): a stale version (412) and an empty language (422, with
 * field `errors` on `body.fr` or `body.en`).
 */
export const LEGAL_ERROR_CODES = {
  versionMismatch: 'content.version-mismatch',
  incomplete: 'content.legal-document-incomplete',
} as const;
