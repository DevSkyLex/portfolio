import type { ArticleDocumentDraft } from '@vfortin/content-web-data-access/admin';

/**
 * Type LegalDocumentFormValues
 * @type LegalDocumentFormValues
 *
 * @description
 * Values of the legal document form: the document of each language.
 */
export type LegalDocumentFormValues = { fr: ArticleDocumentDraft; en: ArticleDocumentDraft };
