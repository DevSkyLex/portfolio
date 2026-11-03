import { z } from 'zod/mini';

/*
 * Public contracts of the identity service (`/api/auth/*`) and access token claims,
 * read by the other services to authorize administration.
 */

/**
 * Constant ADMIN_AUDIENCE
 *
 * @description
 * Audience claim that portfolio services require before accepting an administrator access token.
 */
export const ADMIN_AUDIENCE = 'portfolio-admin' as const;

/**
 * Constant REFRESH_COOKIE
 *
 * @description
 * Base name of the cookie carrying the opaque refresh token. Over HTTPS it takes the
 * `SECURE_COOKIE_PREFIX` (`__Host-portfolio_refresh`).
 */
export const REFRESH_COOKIE = 'portfolio_refresh' as const;

/**
 * Constant DEVICE_COOKIE
 *
 * @description
 * Base name of the cookie carrying the opaque trusted-device token, which lets a password login skip
 * the one-time code on that browser. Over HTTPS it takes the `SECURE_COOKIE_PREFIX`.
 */
export const DEVICE_COOKIE = 'portfolio_device' as const;

/**
 * Constant SECURE_COOKIE_PREFIX
 *
 * @description
 * Prefix of the identity cookies over HTTPS. The browser only accepts a `__Host-` cookie when it is
 * `Secure`, has `Path=/` and no `Domain`, so neither a subdomain nor plain HTTP can plant or shadow it.
 */
export const SECURE_COOKIE_PREFIX = '__Host-' as const;

/**
 * Constant REFRESH_COOKIE_PATH
 *
 * @description
 * Path of the identity cookies in HTTP development, where the `__Host-` prefix (which requires `Path=/`)
 * cannot be used: the cookies then only reach the identity API.
 */
export const REFRESH_COOKIE_PATH = '/api/auth' as const;

/**
 * Constant CSRF_HEADER
 *
 * @description
 * Custom request header required for refresh and logout to reject cross-site form submissions.
 */
export const CSRF_HEADER = 'x-csrf' as const;

/**
 * Constant LoginRequestSchema
 *
 * @description
 * First login step (`POST /api/auth/login`): the administrator credentials and whether the session
 * should outlive the browser ("Se souvenir de moi").
 */
export const LoginRequestSchema = z.object({
  email: z.string().check(z.trim(), z.minLength(3), z.maxLength(254)),
  password: z.string().check(z.minLength(1), z.maxLength(200)),
  remember: z.boolean(),
});

/**
 * Type LoginRequest
 * @type LoginRequest
 *
 * @description
 * Parsed credential fields submitted to the identity login endpoint.
 */
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/**
 * Constant TotpChallengeResponseSchema
 *
 * @description
 * Answer of the first step when the browser is not a trusted device: an opaque, single-use challenge
 * to send back with the one-time code before it expires.
 */
export const TotpChallengeResponseSchema = z.object({
  status: z.literal('totp-required'),
  challenge: z.string().check(z.minLength(32), z.maxLength(128)),
  /** Seconds until the challenge expires. */
  expiresIn: z.int(),
});

/**
 * Type TotpChallengeResponse
 * @type TotpChallengeResponse
 *
 * @description
 * Challenge returned when the one-time code is still required.
 */
export type TotpChallengeResponse = z.infer<typeof TotpChallengeResponseSchema>;

/**
 * Constant TotpRequestSchema
 *
 * @description
 * Second login step (`POST /api/auth/login/totp`): the challenge, the six-digit code and whether this
 * browser becomes a trusted device that skips the code at the next logins.
 */
export const TotpRequestSchema = z.object({
  challenge: z.string().check(z.minLength(32), z.maxLength(128)),
  totp: z.string().check(z.regex(/^\d{6}$/)),
  trustDevice: z.boolean(),
});

/**
 * Type TotpRequest
 * @type TotpRequest
 *
 * @description
 * Parsed second-step fields.
 */
export type TotpRequest = z.infer<typeof TotpRequestSchema>;

/**
 * Constant SessionResponseSchema
 *
 * @description
 * Validates the access token response and its integer lifetime in seconds.
 */
export const SessionResponseSchema = z.object({
  accessToken: z.string(),
  /** Seconds until the access token expires. */
  expiresIn: z.int(),
});

/**
 * Type SessionResponse
 * @type SessionResponse
 *
 * @description
 * Access token data returned after successful administrator authentication.
 */
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

/**
 * Constant AuthenticatedResponseSchema
 *
 * @description
 * Answer of the first step on a trusted device: the session is open at once.
 */
export const AuthenticatedResponseSchema = z.object({
  status: z.literal('authenticated'),
  accessToken: z.string(),
  /** Seconds until the access token expires. */
  expiresIn: z.int(),
});

/**
 * Constant LoginResponseSchema
 *
 * @description
 * Answer of the first login step, told apart by `status`.
 */
export const LoginResponseSchema = z.discriminatedUnion('status', [
  AuthenticatedResponseSchema,
  TotpChallengeResponseSchema,
]);

/**
 * Type LoginResponse
 * @type LoginResponse
 *
 * @description
 * Open session or one-time-code challenge.
 */
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/**
 * Constant AdminClaimsSchema
 *
 * @description
 * Validates the subject, the fixed administrator role and the session carried by access tokens.
 */
export const AdminClaimsSchema = z.object({
  sub: z.string().check(z.minLength(1)),
  role: z.literal('admin'),
  /** Session (refresh-token family) the token was issued for, to trace and revoke a session. */
  sid: z.string().check(z.minLength(1)),
});

/**
 * Type AdminClaims
 * @type AdminClaims
 *
 * @description
 * Authorization claims accepted by services protecting administrator routes.
 */
export type AdminClaims = z.infer<typeof AdminClaimsSchema>;

/**
 * Constant IDENTITY_ERROR_CODES
 *
 * @description
 * Stable problem response codes emitted by identity and administrator authorization endpoints.
 */
export const IDENTITY_ERROR_CODES = {
  invalidCredentials: 'identity.invalid-credentials',
  /** The login challenge is unknown, used, expired or out of attempts: start again from step one. */
  challengeExpired: 'identity.challenge-expired',
  invalidSession: 'identity.invalid-session',
  locked: 'identity.locked',
  unauthorized: 'auth.unauthorized',
} as const;
