import {
  type ArticleDocumentProps,
  type LegalBody,
  LegalDocument,
  type LegalDocumentKind,
  type Locale,
} from '@vfortin/content-domain';
import type {
  Clock,
  SiteTextsRepositories,
  SiteTextsUnitOfWork,
} from '@internal/content-application/lib/ports/content/content.ports';
import { findLegalDocument } from '@internal/content-application/lib/use-cases/get-admin-legal-document/get-admin-legal-document.use-case';

/**
 * Interface LegalDocumentChangeResult
 * @interface LegalDocumentChangeResult
 *
 * @description
 * Document written by a revision, its new version and the queued site revision.
 */
export interface LegalDocumentChangeResult {
  // #region Properties
  /**
   * Property document
   * @readonly
   *
   * @description
   * Revised document.
   */
  readonly document: LegalDocument;

  /**
   * Property version
   * @readonly
   *
   * @description
   * New stored version.
   */
  readonly version: number;

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Published-content revision of the change.
   */
  readonly revision: number;
  // #endregion
}

/**
 * Class ReviseLegalDocument
 * @class ReviseLegalDocument
 *
 * @description
 * Replaces both languages of a legal document, dates the save (« Dernière mise à jour ») and requests
 * the content revision in the same unit of work.
 */
export class ReviseLegalDocument {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the transaction boundary and the clock, which dates the save.
   *
   * @param {SiteTextsUnitOfWork} unitOfWork - Atomic document and revision writes.
   * @param {Clock} clock - Current time.
   */
  public constructor(
    private readonly unitOfWork: SiteTextsUnitOfWork,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Applies the body to the document if it still has `expectedVersion`.
   *
   * @param {LegalDocumentKind} kind - Document named by the route.
   * @param {number} expectedVersion - Version read before editing.
   * @param {Readonly<Record<Locale, ArticleDocumentProps>>} body - New documents per language.
   * @throws {InvalidValueError} Under `body.<locale>` for an illustrated document, before any write.
   * @throws {DomainError} `content.legal-document-incomplete` for an empty language.
   * @throws {NotFoundError} When the document is absent.
   * @throws {VersionMismatchError} When the document changed in the meantime.
   * @returns {Promise<LegalDocumentChangeResult>} Revised document, new version and queued revision.
   */
  public async execute(
    kind: LegalDocumentKind,
    expectedVersion: number,
    body: Readonly<Record<Locale, ArticleDocumentProps>>,
  ): Promise<LegalDocumentChangeResult> {
    const revision: LegalBody = LegalDocument.bodyOf(body);
    return this.unitOfWork.run(
      async ({
        legalDocuments,
        buildRequests,
      }: SiteTextsRepositories): Promise<LegalDocumentChangeResult> => {
        const document: LegalDocument = await findLegalDocument(legalDocuments, kind);
        const now: Date = this.clock.now();
        document.revise(revision, now);
        const version: number = await legalDocuments.save(document, expectedVersion);
        return { document, version, revision: await buildRequests.request(now) };
      },
    );
  }
  // #endregion
}
