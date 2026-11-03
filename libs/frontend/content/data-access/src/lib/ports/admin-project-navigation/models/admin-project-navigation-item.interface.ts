/**
 * Interface AdminProjectNavigationItem
 *
 * @description
 * Read-only command-palette projection published by the content owner.
 */
export interface AdminProjectNavigationItem {
  // #region Properties
  /**
   * Project identity used for tracking.
   */

  /**
   * Property id
   *
   * @description
   * Stable owner identity used for tracking and commands.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Localized display label.
   */

  /**
   * Property label
   *
   * @description
   * Localized navigation display text.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Search aliases independent of the wire format.
   */

  /**
   * Property keywords
   *
   * @description
   * Search aliases independent of the wire representation.
   *
   * @type {readonly string[]}
   */
  readonly keywords: readonly string[];

  /**
   * Owner-resolved navigation destination.
   */

  /**
   * Property path
   *
   * @description
   * Owner-resolved application route destination.
   *
   * @type {string}
   */
  readonly path: string;

  /**
   * Publication status used for the presentation icon.
   */

  /**
   * Property status
   *
   * @description
   * Lifecycle status controlling the available administration actions.
   *
   * @type {'draft' | 'published'}
   */
  readonly status: 'draft' | 'published';
  // #endregion
}
