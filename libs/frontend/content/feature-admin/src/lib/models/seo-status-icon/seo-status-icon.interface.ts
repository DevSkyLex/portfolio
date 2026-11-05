/**
 * Interface SeoStatusIcon
 * @interface SeoStatusIcon
 *
 * @description
 * Icon of a status in a dashboard table: its Lucide SVG and the ink of its meaning (D37). The word
 * goes with it as a tooltip and as visually hidden text, so the colour never carries it alone.
 */
export interface SeoStatusIcon {
  // #region Properties
  /**
   * Property icon
   * @readonly
   *
   * @description
   * Lucide SVG.
   */
  readonly icon: string;

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Classes of the icon's wrapper, the status ink included.
   */
  readonly classes: string;
  // #endregion
}
