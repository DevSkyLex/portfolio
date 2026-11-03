/**
 * Interface SelectOptionRef
 * @interface SelectOptionRef
 *
 * @description
 * Describes the minimal option surface required by the select host without coupling the token contract to its
 * component implementation.
 */
export interface SelectOptionRef {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable option id used by the trigger's active-descendant relationship.
   *
   * @type {string}
   */
  readonly id: string;
  // #endregion

  // #region Methods
  /**
   * Method value
   * @method value
   *
   * @description
   * Reads the option's current generic value through the host-neutral contract.
   *
   * @returns {unknown} Current option value.
   */
  value(): unknown;
  // #endregion
}
