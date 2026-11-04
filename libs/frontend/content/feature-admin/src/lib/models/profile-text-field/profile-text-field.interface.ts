/**
 * Interface ProfileTextField
 * @interface ProfileTextField
 *
 * @description
 * One text of the « Présentation » section of the profile form.
 */
export interface ProfileTextField {
  // #region Properties
  /**
   * Property key
   * @readonly
   *
   * @description
   * Profile field, also its contract path.
   *
   * @type {'heroIntro' | 'aboutStatement' | 'aboutLead'}
   */
  readonly key: 'heroIntro' | 'aboutStatement' | 'aboutLead';

  /**
   * Property label
   * @readonly
   *
   * @description
   * Field label.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property hint
   * @readonly
   *
   * @description
   * Where the site shows the text.
   *
   * @type {string}
   */
  readonly hint: string;

  /**
   * Property max
   * @readonly
   *
   * @description
   * Longest trimmed text.
   *
   * @type {number}
   */
  readonly max: number;

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Visible lines of the text area.
   *
   * @type {number}
   */
  readonly rows: number;
  // #endregion
}
