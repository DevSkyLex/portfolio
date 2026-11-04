import type { LegalBlock } from '@internal/legal-web-feature/lib/models/legal-document/legal-block.type';
import type { LegalSection } from '@internal/legal-web-feature/lib/models/legal-document/legal-section.interface';

/**
 * Interface LegalDocument
 * @interface LegalDocument
 *
 * @description
 * Legal notice or privacy policy in the site locale, as the content snapshot publishes it (D7).
 */
export interface LegalDocument {
  // #region Properties
  /**
   * Property updatedOn
   * @readonly
   *
   * @description
   * Date of the last save, `YYYY-MM-DD`.
   *
   * @type {string}
   */
  readonly updatedOn: string;

  /**
   * Property intro
   * @readonly
   *
   * @description
   * Blocks before the first level-2 heading.
   *
   * @type {readonly LegalBlock[]}
   */
  readonly intro: readonly LegalBlock[];

  /**
   * Property sections
   * @readonly
   *
   * @description
   * Sections in document order.
   *
   * @type {readonly LegalSection[]}
   */
  readonly sections: readonly LegalSection[];
  // #endregion
}
