/**
 * Interface MenuRun
 * @interface MenuRun
 *
 * @description
 * Options controlling one run of menu panel motion, including reduced motion and optional callbacks.
 */
export interface MenuRun {
  // #region Properties
  /**
   * Property reduced
   * @readonly
   *
   * @description
   * Whether this run uses the reduced-motion fade path.
   *
   * @type {boolean}
   */
  readonly reduced: boolean;

  /**
   * Property above
   * @readonly
   *
   * @description
   * Optional known side of the list; otherwise geometry determines whether the overlay flipped above the trigger.
   *
   * @type {boolean | undefined}
   */
  readonly above?: boolean;

  /**
   * Property onFrame
   * @readonly
   *
   * @description
   * Optional callback for per-frame visibility or pointer-state updates.
   *
   * @type {((p: number) => void) | undefined}
   */
  readonly onFrame?: (p: number) => void;

  /**
   * Property done
   * @readonly
   *
   * @description
   * Optional callback invoked after a closing run resets the elements.
   *
   * @type {(() => void) | undefined}
   */
  readonly done?: () => void;
  // #endregion
}
