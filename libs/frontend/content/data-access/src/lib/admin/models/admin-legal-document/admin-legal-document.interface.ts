import type { ArticleDocumentDraft } from '@internal/content-web-data-access/lib/admin/models/article-document/article-document-draft.interface';
import type { LegalDocumentKind } from '@internal/content-web-data-access/lib/admin/models/legal-document-kind/legal-document-kind.type';

/**
 * Interface AdminLegalDocument
 * @interface AdminLegalDocument
 *
 * @description
 * Legal document as the administration edits it: one article document per language (D40, without
 * figures), the time of its last save and the version quoted in `If-Match`.
 */
export interface AdminLegalDocument {
  // #region Properties
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Which document.
   *
   * @type {LegalDocumentKind}
   */
  readonly kind: LegalDocumentKind;

  /**
   * Property body
   * @readonly
   *
   * @description
   * Document per language.
   *
   * @type {Readonly<{ fr: ArticleDocumentDraft; en: ArticleDocumentDraft }>}
   */
  readonly body: Readonly<{ fr: ArticleDocumentDraft; en: ArticleDocumentDraft }>;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * ISO date-time of the last save, shown as « Dernière mise à jour ».
   *
   * @type {string}
   */
  readonly updatedAt: string;

  /**
   * Property version
   * @readonly
   *
   * @description
   * Version read, quoted in `If-Match`.
   *
   * @type {number}
   */
  readonly version: number;
  // #endregion
}
