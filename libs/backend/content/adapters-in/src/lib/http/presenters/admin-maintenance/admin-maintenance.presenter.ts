import type { AdminMaintenanceDto, MaintenanceRequest } from '@vfortin/content-contracts';
import type { MaintenanceMode, MaintenanceModeDraft } from '@vfortin/content-domain';

/**
 * Function toMaintenanceDraft
 *
 * @description
 * Maps a validated request to the domain draft; the field names are the same, so the domain reports
 * its errors under the contract paths (`message.fr`, `message.en`).
 *
 * @param {MaintenanceRequest} body - Contract-validated revision.
 * @returns {MaintenanceModeDraft} Domain draft.
 */
export function toMaintenanceDraft(body: MaintenanceRequest): MaintenanceModeDraft {
  return { enabled: body.enabled, message: body.message };
}

/**
 * Function toAdminMaintenanceDto
 *
 * @description
 * Presents the setting to the administration; a missing English message is left out, as in the
 * request.
 *
 * @param {MaintenanceMode} mode - Setting to present.
 * @returns {AdminMaintenanceDto} Administration setting.
 */
export function toAdminMaintenanceDto(mode: MaintenanceMode): AdminMaintenanceDto {
  return { enabled: mode.enabled, message: { ...mode.message }, version: mode.version };
}
