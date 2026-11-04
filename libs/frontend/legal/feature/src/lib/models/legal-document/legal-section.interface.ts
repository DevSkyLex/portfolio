import type { LegalBlock } from '@internal/legal-web-feature/lib/models/legal-document/legal-block.type';

/**
 * Interface LegalSection
 * @interface LegalSection
 *
 * @description
 * Part of a legal document opened by a level-2 heading, rendered as a labelled `section`.
 */
export interface LegalSection {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Slug of the heading, unique within the document.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Plain text of the heading.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property blocks
   * @readonly
   *
   * @description
   * Blocks until the next level-2 heading.
   *
   * @type {readonly LegalBlock[]}
   */
  readonly blocks: readonly LegalBlock[];
  // #endregion
}
