/**
 * Interface MenuLayout
 * @interface MenuLayout
 *
 * @description
 * Geometry sampled for one animation run and invalidated when overlay positioning changes.
 */
export interface MenuLayout {
  // #region Properties
  /**
   * Property above
   * @readonly
   *
   * @description
   * Whether the floating list is positioned above the trigger.
   *
   * @type {boolean}
   */
  readonly above: boolean;

  /**
   * Property height
   * @readonly
   *
   * @description
   * List height in layout pixels used to calculate the clipped reveal.
   *
   * @type {number}
   */
  readonly height: number;
  // #endregion
}
