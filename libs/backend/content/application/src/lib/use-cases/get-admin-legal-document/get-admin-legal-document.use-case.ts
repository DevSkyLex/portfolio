import type { LegalDocument, LegalDocumentKind } from '@vfortin/content-domain';
import { NotFoundError } from '@internal/content-application/lib/errors/application-error';
import type { LegalDocumentRepository } from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Function findLegalDocument
 *
 * @description
 * Loads a legal document, which exists once migration 0009 or the seed ran.
 *
 * @param {LegalDocumentRepository} documents - Legal documents.
 * @param {LegalDocumentKind} kind - Document named by the route.
 * @throws {NotFoundError} When the document is absent.
 * @returns {Promise<LegalDocument>} Document.
 */
export async function findLegalDocument(
  documents: LegalDocumentRepository,
  kind: LegalDocumentKind,
): Promise<LegalDocument> {
  const document: LegalDocument | null = await documents.get(kind);
  if (document === null) {
    throw new NotFoundError('Legal document');
  }
  return document;
}

/**
 * Class GetAdminLegalDocument
 * @class GetAdminLegalDocument
 *
 * @description
 * Loads the legal notice or the privacy policy for the administration editor.
 */
export class GetAdminLegalDocument {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the legal document repository.
   *
   * @param {LegalDocumentRepository} documents - Legal documents.
   */
  public constructor(private readonly documents: LegalDocumentRepository) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Returns the document, or rejects with `NotFoundError`.
   *
   * @param {LegalDocumentKind} kind - Document named by the route.
   * @returns {Promise<LegalDocument>} Document.
   */
  public execute(kind: LegalDocumentKind): Promise<LegalDocument> {
    return findLegalDocument(this.documents, kind);
  }
  // #endregion
}
