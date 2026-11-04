import { loadConfig } from '@vfortin/backend-config';
import { z } from 'zod';

/**
 * Constant IdentityServiceConfigSchema
 *
 * @description
 * Validates identity persistence, signing-key, issuer and cookie settings before the service is composed.
 */
const IdentityServiceConfigSchema = z.object({
  IDENTITY_PORT: z.coerce.number().int().positive().default(3103),
  /** `postgres://…` in production; `pglite:<directory>` or `pglite:memory` without Docker. */
  IDENTITY_DATABASE_URL: z.string().min(1),
  IDENTITY_MIGRATIONS_DIR: z.string().min(1).optional(),
  /** Directory of the Ed25519 keys `<kid>.pem` (Docker secret in production). */
  IDENTITY_KEYS_DIR: z.string().min(1),
  /** Key that signs new tokens; the directory's other keys stay published. */
  IDENTITY_SIGNING_KID: z.string().regex(/^[\w-]{1,64}$/),
  /** Token issuer, verified by the other services, and OAuth authorization server issuer (D45). */
  IDENTITY_ISSUER: z.url(),
  /**
   * MCP resource the OAuth server issues tokens for (RFC 8707, D45); defaults to the issuer's origin
   * followed by `/api/content/mcp`.
   */
  IDENTITY_MCP_RESOURCE: z.url().optional(),
  /** `Secure` cookie: can only be disabled for HTTP development. */
  IDENTITY_COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value: 'true' | 'false'): boolean => value === 'true'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Type IdentityServiceConfig
 * @type IdentityServiceConfig
 *
 * @description
 * Runtime-validated settings consumed by identity service composition and startup.
 */
export type IdentityServiceConfig = z.infer<typeof IdentityServiceConfigSchema>;

/**
 * Function loadIdentityServiceConfig
 *
 * @description
 * Loads and validates identity service settings from the process environment before startup.
 *
 * @returns {IdentityServiceConfig} Validated identity service settings.
 */
export function loadIdentityServiceConfig(): IdentityServiceConfig {
  return loadConfig<typeof IdentityServiceConfigSchema>(IdentityServiceConfigSchema);
}
