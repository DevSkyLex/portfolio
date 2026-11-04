import type { LegalInline } from '@internal/legal-web-feature/lib/models/legal-document/legal-inline.type';

/**
 * Interface LegalParagraph
 * @interface LegalParagraph
 *
 * @description
 * Paragraph, at the top level, in a list item or in a quotation.
 */
export interface LegalParagraph {
  // #region Properties
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Block discriminant.
   *
   * @type {'paragraph'}
   */
  readonly kind: 'paragraph';

  /**
   * Property content
   * @readonly
   *
   * @description
   * Inline content; empty for an empty paragraph.
   *
   * @type {readonly LegalInline[]}
   */
  readonly content: readonly LegalInline[];
  // #endregion
}
