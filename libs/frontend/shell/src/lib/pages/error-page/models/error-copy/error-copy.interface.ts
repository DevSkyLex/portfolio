/**
 * Interface ErrorCopy
 * @interface ErrorCopy
 *
 * @description
 * Localized page content and retry behavior for a supported error code.
 */
export interface ErrorCopy {
  // #region Properties
  /**
   * Property title
   * @readonly
   *
   * @description
   * Heading displayed for the selected error.
   *
   * @type {string}
   */
  readonly title: string;

  /**
   * Property text
   * @readonly
   *
   * @description
   * Supporting explanation displayed below the heading.
   *
   * @type {string}
   */
  readonly text: string;

  /**
   * Property retry
   * @readonly
   *
   * @description
   * Whether the page offers a reload action for this error.
   *
   * @type {boolean}
   */
  readonly retry: boolean;
  // #endregion
}
