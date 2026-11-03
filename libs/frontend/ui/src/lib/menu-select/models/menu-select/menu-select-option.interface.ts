/**
 * Interface MenuSelectOption
 * @interface MenuSelectOption
 *
 * @description
 * Supplies the selected value and displayed text for one menu-select option.
 *
 * @template T - String value type exposed by the selection model.
 */
export interface MenuSelectOption<T extends string = string> {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Application value emitted when the option is chosen.
   *
   * @type {T}
   */
  readonly value: T;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Visible option text and accessible name.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property lang
   * @readonly
   *
   * @description
   * Optional language tag for labels that differ from the surrounding page language.
   *
   * @type {string | undefined}
   */
  readonly lang?: string;
  // #endregion
}
