/**
 * Interface DialogPanel
 * @interface DialogPanel
 *
 * @description
 * Appearance and accessibility settings consumed by the shared CDK dialog container.
 */
export interface DialogPanel {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Complete class list applied to the visible panel host.
   *
   * @type {string}
   */
  readonly class: string;

  /**
   * Property slot
   * @readonly
   *
   * @description
   * Data-slot value identifying the concrete panel variant.
   *
   * @type {string}
   */
  readonly slot: string;

  /**
   * Property closeLabel
   * @readonly
   *
   * @description
   * Accessible name of the built-in close control, or null to omit that control.
   *
   * @type {string | null}
   */
  readonly closeLabel: string | null;
  // #endregion
}
