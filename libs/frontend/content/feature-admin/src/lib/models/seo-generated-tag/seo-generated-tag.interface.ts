/**
 * Interface SeoGeneratedTag
 * @interface SeoGeneratedTag
 *
 * @description
 * One row of the editor's « Balises générées » list: a head element the public page will emit.
 */
export interface SeoGeneratedTag {
  // #region Properties
  /**
   * Property name
   * @readonly
   *
   * @description
   * Short name of the element, such as `title`, `canonical`, `hreflang fr`, `og:title` or `JSON-LD`;
   * unique in a list.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Value as displayed, possibly a summary (JSON-LD).
   *
   * @type {string}
   */
  readonly value: string;

  /**
   * Property full
   * @readonly
   *
   * @description
   * Complete value, shown in the row's `title` when the displayed one is cut or summarized.
   *
   * @type {string}
   */
  readonly full: string;
  // #endregion
}
