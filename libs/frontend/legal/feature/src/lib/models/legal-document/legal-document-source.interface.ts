import type { LegalDocument } from '@internal/legal-web-feature/lib/models/legal-document/legal-document.interface';
import type { LegalDocumentKind } from '@internal/legal-web-feature/lib/models/legal-document/legal-document-kind.type';

/**
 * Interface LegalDocumentSource
 * @interface LegalDocumentSource
 *
 * @description
 * Port through which the legal pages read their documents. The documents are content (the « Légal »
 * administration page, published in the snapshot), and the legal context reads no content library,
 * so the shell binds this port to the content snapshot with `LEGAL_DOCUMENTS`.
 */
export interface LegalDocumentSource {
  // #region Methods
  /**
   * Method document
   * @method document
   *
   * @description
   * Returns a document of the active locale; public routes have read the snapshot before they
   * activate.
   *
   * @param {LegalDocumentKind} kind - Document.
   *
   * @returns {LegalDocument} Document.
   */
  document(kind: LegalDocumentKind): LegalDocument;
  // #endregion
}
