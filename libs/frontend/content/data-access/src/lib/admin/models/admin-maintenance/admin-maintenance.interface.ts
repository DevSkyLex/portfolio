/**
 * Interface AdminMaintenance
 * @interface AdminMaintenance
 *
 * @description
 * Maintenance setting of the public site as the administration reads it: the switch, the message per
 * locale (English absent when not written) and the version quoted in `If-Match`.
 */
export interface AdminMaintenance {
  // #region Properties
  /**
   * Property enabled
   * @readonly
   *
   * @description
   * Whether every public page shows the maintenance screen.
   *
   * @type {boolean}
   */
  readonly enabled: boolean;

  /**
   * Property message
   * @readonly
   *
   * @description
   * Message of the screen; an empty French message means the default line.
   *
   * @type {{ readonly fr: string; readonly en?: string }}
   */
  readonly message: { readonly fr: string; readonly en?: string };

  /**
   * Property version
   * @readonly
   *
   * @description
   * Optimistic-lock version.
   *
   * @type {number}
   */
  readonly version: number;
  // #endregion
}
