import type { ProfileLinkKind } from '@vfortin/content-web-data-access/admin';

/**
 * Interface ProfileLinkKindOption
 * @interface ProfileLinkKindOption
 *
 * @description
 * Choice of the link kind select, with the example address of its field.
 */
export interface ProfileLinkKindOption {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Link kind.
   *
   * @type {ProfileLinkKind}
   */
  readonly value: ProfileLinkKind;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Option text, also the public name of a link without label.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property placeholder
   * @readonly
   *
   * @description
   * Example address of the field.
   *
   * @type {string}
   */
  readonly placeholder: string;
  // #endregion
}
