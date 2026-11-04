import type { CallState } from '@vfortin/web-http';
import type { AdminLegalDocument } from '@internal/content-web-data-access/lib/admin/models/admin-legal-document/admin-legal-document.interface';
import type { LegalDocumentKind } from '@internal/content-web-data-access/lib/admin/models/legal-document-kind/legal-document-kind.type';

/**
 * Interface AdminLegalState
 * @interface AdminLegalState
 *
 * @description
 * Both legal documents last read or written and the state of each independent call; the documents are
 * read together, and one save runs at a time.
 */
export interface AdminLegalState {
  // #region Properties
  /**
   * Property documents
   * @readonly
   *
   * @description
   * Documents by kind, `null` before the first read.
   *
   * @type {Readonly<Record<LegalDocumentKind, AdminLegalDocument>> | null}
   */
  readonly documents: Readonly<Record<LegalDocumentKind, AdminLegalDocument>> | null;

  /**
   * Property loadCallState
   * @readonly
   *
   * @description
   * State of the read of both documents.
   *
   * @type {CallState}
   */
  readonly loadCallState: CallState;

  /**
   * Property writeCallState
   * @readonly
   *
   * @description
   * State of the last save.
   *
   * @type {CallState}
   */
  readonly writeCallState: CallState;

  /**
   * Property writeKind
   * @readonly
   *
   * @description
   * Document of the last save, which a conflict concerns.
   *
   * @type {LegalDocumentKind | null}
   */
  readonly writeKind: LegalDocumentKind | null;
  // #endregion
}
