/**
 * Interface LegalDocumentTexts
 * @interface LegalDocumentTexts
 *
 * @description
 * Copy of one legal document on the « Légal » page.
 */
export interface LegalDocumentTexts {
  // #region Properties
  /**
   * Property tab
   * @readonly
   *
   * @description
   * Tab label, also the document name in the toasts.
   *
   * @type {string}
   */
  readonly tab: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * What the document must cover (RGPD), under each language heading.
   *
   * @type {string}
   */
  readonly description: string;

  /**
   * Property path
   * @readonly
   *
   * @description
   * Public address of the page.
   *
   * @type {string}
   */
  readonly path: string;
  // #endregion
}
