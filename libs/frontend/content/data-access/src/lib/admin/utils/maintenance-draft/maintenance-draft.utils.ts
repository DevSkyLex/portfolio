import type { AdminMaintenanceDto, MaintenanceRequest } from '@vfortin/content-contracts';
import type { AdminMaintenance } from '@internal/content-web-data-access/lib/admin/models/admin-maintenance/admin-maintenance.interface';
import type { MaintenanceDraft } from '@internal/content-web-data-access/lib/admin/models/maintenance-draft/maintenance-draft.interface';

/**
 * Function toAdminMaintenance
 *
 * @description
 * Maps the administration DTO to its view model, leaving out an absent English message.
 *
 * @param {AdminMaintenanceDto} dto - Setting received from the API.
 *
 * @returns {AdminMaintenance} View model.
 */
export function toAdminMaintenance(dto: AdminMaintenanceDto): AdminMaintenance {
  return {
    enabled: dto.enabled,
    message:
      dto.message.en === undefined
        ? { fr: dto.message.fr }
        : { fr: dto.message.fr, en: dto.message.en },
    version: dto.version,
  };
}

/**
 * Function toMaintenanceDraft
 *
 * @description
 * Form values of a setting; an English message not written reads as empty.
 *
 * @param {AdminMaintenance} setting - Stored setting.
 *
 * @returns {MaintenanceDraft} Form values.
 */
export function toMaintenanceDraft(setting: AdminMaintenance): MaintenanceDraft {
  return {
    enabled: setting.enabled,
    message: { fr: setting.message.fr, en: setting.message.en ?? '' },
  };
}

/**
 * Function toMaintenanceRequest
 *
 * @description
 * Request body of a form, trimmed; a blank English message is left out (French is shown instead).
 *
 * @param {MaintenanceDraft} draft - Form values.
 *
 * @returns {MaintenanceRequest} Revision request.
 */
export function toMaintenanceRequest(draft: MaintenanceDraft): MaintenanceRequest {
  const fr: string = draft.message.fr.trim();
  const en: string = draft.message.en.trim();
  return { enabled: draft.enabled, message: en === '' ? { fr } : { fr, en } };
}
