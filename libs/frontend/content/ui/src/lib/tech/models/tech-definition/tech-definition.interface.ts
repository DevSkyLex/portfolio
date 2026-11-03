/**
 * Interface TechDefinition
 * @interface TechDefinition
 *
 * @description
 * Display label and optional SVG icon for one technology tag.
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

  /**
   * Property icon
   * @readonly
   *
   * @description
   * SVG markup for the catalogue logo; undefined when no logo is registered.
   *
   * @type {string | undefined}
   */
  readonly icon?: string;
  // #endregion
}
