import type { LegalFlowBlock } from '@internal/legal-web-feature/lib/models/legal-document/legal-flow-block.type';

/**
 * Interface LegalList
 * @interface LegalList
 *
 * @description
 * Bullet or ordered list; each item holds paragraphs and nested lists.
 */
export interface LegalList {
  // #region Properties
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Block discriminant.
   *
   * @type {'list'}
   */
  readonly kind: 'list';

  /**
   * Property ordered
   * @readonly
   *
   * @description
   * Whether the items are numbered.
   *
   * @type {boolean}
   */
  readonly ordered: boolean;

  /**
   * Property start
   * @readonly
   *
   * @description
   * Number of the first item of an ordered list.
   *
   * @type {number}
   */
  readonly start: number;

  /**
   * Property items
   * @readonly
   *
   * @description
   * Items, each one the blocks it contains.
   *
   * @type {readonly (readonly LegalFlowBlock[])[]}
   */
  readonly items: readonly (readonly LegalFlowBlock[])[];
  // #endregion
}
