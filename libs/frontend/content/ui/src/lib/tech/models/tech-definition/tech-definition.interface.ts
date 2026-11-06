/**
 * Interface TechDefinition
 * @interface TechDefinition
 *
 * @description
 * Display label of one technology tag; its logo, when an icon pack draws one, is in `TECH_LOGOS`.
 */
export interface TechDefinition {
  // #region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Name displayed alongside the technology icon.
   *
   * @type {string}
   */
  readonly label: string;
  // #endregion
}
