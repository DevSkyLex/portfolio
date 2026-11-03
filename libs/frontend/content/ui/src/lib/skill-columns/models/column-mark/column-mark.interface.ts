import type { GlyphShape } from '@vfortin/ui';

/**
 * Interface ColumnMark
 * @interface ColumnMark
 *
 * @description
 * Glyph shape and token colour assigned to a skill column by its position.
 */
export interface ColumnMark {
  // #region Properties
  /**
   * Property shape
   * @readonly
   *
   * @description
   * Glyph shape used for the column marker.
   *
   * @type {GlyphShape}
   */
  readonly shape: GlyphShape;

  /**
   * Property color
   * @readonly
   *
   * @description
   * CSS custom property that supplies this column's aurora tint.
   *
   * @type {string}
   */
  readonly color: string;
  // #endregion
}
