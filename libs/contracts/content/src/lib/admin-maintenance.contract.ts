import { z } from 'zod/mini';

/**
 * Constant MAINTENANCE_LIMITS
 *
 * @description
 * Longest trimmed maintenance message per locale, mirrored by the domain's `MAINTENANCE_LIMITS`, the
 * public snapshot's `MaintenanceDtoSchema` and the admin form's browser copy (D10).
 */
export const MAINTENANCE_LIMITS = { message: 500 } as const;

/**
 * Constant MaintenanceMessage
 *
 * @description
 * Message per locale: an empty French message shows the screen's default line, a missing or blank
 * English one falls back on French.
 */
const MaintenanceMessage = z.object({
  fr: z.string().check(z.trim(), z.maxLength(MAINTENANCE_LIMITS.message)),
  en: z.optional(z.string().check(z.trim(), z.maxLength(MAINTENANCE_LIMITS.message))),
});

/**
 * Constant MaintenanceRequestSchema
 *
 * @description
 * Body of a maintenance revision: the switch and the message, which defaults to none.
 */
export const MaintenanceRequestSchema = z.object({
  enabled: z.boolean(),
  message: z._default(MaintenanceMessage, { fr: '' }),
});

/**
 * Type MaintenanceRequest
 * @type MaintenanceRequest
 *
 * @description
 * Validated maintenance revision.
 */
export type MaintenanceRequest = z.infer<typeof MaintenanceRequestSchema>;

/**
 * Constant AdminMaintenanceDtoSchema
 *
 * @description
 * Setting as the administration reads it, with its version (also its `ETag`).
 */
export const AdminMaintenanceDtoSchema = z.object({
  enabled: z.boolean(),
  message: MaintenanceMessage,
  version: z.int().check(z.minimum(1)),
});

/**
 * Type AdminMaintenanceDto
 * @type AdminMaintenanceDto
 *
 * @description
 * Administration maintenance setting.
 */
export type AdminMaintenanceDto = z.infer<typeof AdminMaintenanceDtoSchema>;

/**
 * Constant MAINTENANCE_ERROR_CODES
 *
 * @description
 * Problem codes of the maintenance administration besides `request.invalid` (400) and
 * `request.precondition-required` (428): a stale version (412) and a message over its limit (422).
 */
export const MAINTENANCE_ERROR_CODES = {
  versionMismatch: 'content.version-mismatch',
  invalidValue: 'content.invalid-value',
} as const;
