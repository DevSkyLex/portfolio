import { z } from 'zod/mini';

/**
 * Constant TotpCode
 *
 * @description
 * Six-digit code of the authenticator application.
 */
const TotpCode = z.string().check(z.regex(/^\d{6}$/));

/**
 * Constant Password
 *
 * @description
 * Current password, asked again before any change of the second factor.
 */
const Password = z.string().check(z.minLength(1), z.maxLength(200));

/**
 * Constant TwoFactorStatusResponseSchema
 *
 * @description
 * State of the one-time code (`GET /api/auth/totp`, administrator only): disabled until the
 * administrator enrolls an authenticator (D17).
 */
export const TwoFactorStatusResponseSchema = z.object({ enabled: z.boolean() });

/**
 * Type TwoFactorStatusResponse
 * @type TwoFactorStatusResponse
 *
 * @description
 * Whether the login asks for a one-time code.
 */
export type TwoFactorStatusResponse = z.infer<typeof TwoFactorStatusResponseSchema>;

/**
 * Constant TwoFactorSetupRequestSchema
 *
 * @description
 * Start of the enrollment (`POST /api/auth/totp/setup`): the current password, so that a stolen
 * session cannot attach the attacker's authenticator.
 */
export const TwoFactorSetupRequestSchema = z.object({ password: Password });

/**
 * Type TwoFactorSetupRequest
 * @type TwoFactorSetupRequest
 *
 * @description
 * Password confirmation that opens an enrollment.
 */
export type TwoFactorSetupRequest = z.infer<typeof TwoFactorSetupRequestSchema>;

/**
 * Constant TwoFactorSetupResponseSchema
 *
 * @description
 * Pending secret, in Base32 for manual entry and as an `otpauth://` URI for a QR code; it becomes active
 * only once a code generated from it is confirmed, and a new setup replaces it.
 */
export const TwoFactorSetupResponseSchema = z.object({
  secret: z.string().check(z.regex(/^[A-Z2-7]{16,128}$/)),
  provisioningUri: z.string().check(z.regex(/^otpauth:\/\/totp\//)),
});

/**
 * Type TwoFactorSetupResponse
 * @type TwoFactorSetupResponse
 *
 * @description
 * Enrollment material shown once to the administrator.
 */
export type TwoFactorSetupResponse = z.infer<typeof TwoFactorSetupResponseSchema>;

/**
 * Constant TwoFactorEnableRequestSchema
 *
 * @description
 * End of the enrollment (`POST /api/auth/totp/enable`): a code generated from the pending secret.
 */
export const TwoFactorEnableRequestSchema = z.object({ totp: TotpCode });

/**
 * Type TwoFactorEnableRequest
 * @type TwoFactorEnableRequest
 *
 * @description
 * Code proving the authenticator holds the pending secret.
 */
export type TwoFactorEnableRequest = z.infer<typeof TwoFactorEnableRequestSchema>;

/**
 * Constant TwoFactorDisableRequestSchema
 *
 * @description
 * Removal of the second factor (`POST /api/auth/totp/disable`): the password and a current code;
 * trusted devices are forgotten with it.
 */
export const TwoFactorDisableRequestSchema = z.object({ password: Password, totp: TotpCode });

/**
 * Type TwoFactorDisableRequest
 * @type TwoFactorDisableRequest
 *
 * @description
 * Both factors, required to turn the second one off.
 */
export type TwoFactorDisableRequest = z.infer<typeof TwoFactorDisableRequestSchema>;

/**
 * Constant TWO_FACTOR_ERROR_CODES
 *
 * @description
 * Problem codes of the second-factor endpoints, answered with 422 (wrong password or code) or 409
 * (state), never 401, so that the client keeps its session.
 */
export const TWO_FACTOR_ERROR_CODES = {
  /** 422: the password asked again is wrong; it counts towards the account lock. */
  passwordMismatch: 'identity.password-mismatch',
  /** 422: the code does not match the pending (enable) or active (disable) secret. */
  totpInvalid: 'identity.totp-invalid',
  /** 409: enable without a pending setup, setup or enable while active, disable while inactive. */
  totpState: 'identity.totp-state',
} as const;
