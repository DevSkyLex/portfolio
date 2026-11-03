import type { BadgeVariant } from '@vfortin/ui';

/**
 * Interface MessageStatusTag
 * @interface MessageStatusTag
 *
 * @description
 * How a message status renders in the reading pane: a French label on a status badge (D37).
 */
export interface MessageStatusTag {
  // #region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * French label of the status.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property variant
   * @readonly
   *
   * @description
   * Badge family carrying the status meaning.
   *
   * @type {BadgeVariant}
   */
  readonly variant: BadgeVariant;
  // #endregion
}
