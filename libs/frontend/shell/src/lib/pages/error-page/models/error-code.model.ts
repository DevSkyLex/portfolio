/**
 * Constant ERROR_CODES
 *
 * @description
 * Error route codes with localized content and status handling in the web shell.
 *
 * @type {readonly ['403', '404', '500', '503']}
 */
export const ERROR_CODES = ['403', '404', '500', '503'] as const;

/**
 * Type ErrorCode
 * @type ErrorCode
 *
 * @description
 * Supported error route code used to select localized page copy and its pixel glyphs.
 *
 * @type {(typeof ERROR_CODES)[number]}
 */
export type ErrorCode = (typeof ERROR_CODES)[number];
