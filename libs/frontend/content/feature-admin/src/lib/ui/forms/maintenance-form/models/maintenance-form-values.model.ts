import type { BilingualText } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/bilingual-text.interface';

/**
 * Interface MaintenanceFormValues
 * @interface MaintenanceFormValues
 *
 * @description
 * Values of the maintenance form, the shape of `MaintenanceDraft` that the data access converts to a
 * request: the switch and one optional message per language.
 */
export interface MaintenanceFormValues {
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
   * « Message » per language, empty when not written.
   *
   * @type {BilingualText}
   */
  message: BilingualText;
  // #endregion
}
