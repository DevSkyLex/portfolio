/**
 * Public identity exports
 *
 * @description
 * Exposes login/session contracts, administrator token claims and shared cookie, CSRF and error-code constants.
 */
export {
  ADMIN_AUDIENCE,
  AdminClaimsSchema,
  AuthenticatedResponseSchema,
  CSRF_HEADER,
  DEVICE_COOKIE,
  IDENTITY_ERROR_CODES,
  LoginRequestSchema,
  LoginResponseSchema,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  SECURE_COOKIE_PREFIX,
  SessionResponseSchema,
  TotpChallengeResponseSchema,
  TotpRequestSchema,
  type AdminClaims,
  type LoginRequest,
  type LoginResponse,
  type SessionResponse,
  type TotpChallengeResponse,
  type TotpRequest,
} from '@internal/identity-contracts/lib/identity.contract';
