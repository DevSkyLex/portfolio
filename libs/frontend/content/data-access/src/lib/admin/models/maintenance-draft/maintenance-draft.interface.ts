import type { BilingualText } from '@internal/content-web-data-access/lib/admin/models/bilingual-text/bilingual-text.interface';

/**
 * Interface MaintenanceDraft
 * @interface MaintenanceDraft
 *
 * @description
 * Values of the maintenance form: the switch and one message per language, empty when not written.
 */
export interface MaintenanceDraft {
  // #region Properties
  /**
   * Property enabled
   *
   * @description
   * « Mode maintenance » switch.
   *
   * @type {boolean}
   */
  enabled: boolean;

  /**
   * Property message
   *
   * @description
   * Message per language.
   *
   * @type {BilingualText}
   */
  message: BilingualText;
  // #endregion
}
