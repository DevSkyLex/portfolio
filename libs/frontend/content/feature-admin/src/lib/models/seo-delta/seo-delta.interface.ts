/**
 * Interface SeoDelta
 * @interface SeoDelta
 *
 * @description
 * Change of a figure against the period before: its signed display, its direction and whether that
 * direction is good for the site (more clicks, a lower average position).
 */
export interface SeoDelta {
  // #region Properties
  /**
   * Property display
   * @readonly
   *
   * @description
   * Signed change (`+12 %`, `−1,3`).
   *
   * @type {string}
   */
  readonly display: string;

  /**
   * Property direction
   * @readonly
   *
   * @description
   * Direction of the figure itself.
   *
   * @type {'up' | 'down' | 'flat'}
   */
  readonly direction: 'up' | 'down' | 'flat';

  /**
   * Property tone
   * @readonly
   *
   * @description
   * `good` or `bad` for the site, `flat` without a change worth a colour.
   *
   * @type {'good' | 'bad' | 'flat'}
   */
  readonly tone: 'good' | 'bad' | 'flat';
  // #endregion
}
