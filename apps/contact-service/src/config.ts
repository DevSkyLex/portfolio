import { loadConfig } from '@vfortin/backend-config';
import { z } from 'zod';

/**
 * Constant ContactServiceConfigSchema
 *
 * @description
 * Validates contact service environment values, including database, mail delivery, rate-limit key and trusted auth settings.
 */
const ContactServiceConfigSchema = z.object({
  CONTACT_PORT: z.coerce.number().int().positive().default(3102),
  /** `postgres://…` in production; `pglite:<directory>` or `pglite:memory` without Docker. */
  CONTACT_DATABASE_URL: z.string().min(1),
  /** Drizzle migrations directory; defaults to the one copied next to the bundle. */
  CONTACT_MIGRATIONS_DIR: z.string().min(1).optional(),
  /** `smtp://…` or `smtps://…`; `json:` logs without sending (development). */
  CONTACT_SMTP_URL: z.string().min(1),
  CONTACT_MAIL_FROM: z.string().min(3),
  CONTACT_NOTIFY_TO: z.email(),
  /** Secret for the origin fingerprint (rate limit): at least 32 characters. */
  CONTACT_CLIENT_KEY_SECRET: z.string().min(32),
  /** Proxies whose `X-Forwarded-For` header is trusted (Nginx), in Express `trust proxy` format. */
  CONTACT_TRUST_PROXY: z.string().default('loopback, uniquelocal'),
  /** Issuer of the admin tokens and JWKS of the identity service (internal network). */
  AUTH_ISSUER: z.url(),
  AUTH_JWKS_URL: z.url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Type ContactServiceConfig
 * @type ContactServiceConfig
 *
 * @description
 * Runtime-validated settings consumed by contact service composition and startup.
 */
export type ContactServiceConfig = z.infer<typeof ContactServiceConfigSchema>;

/**
 * Function loadContactServiceConfig
 *
 * @description
 * Loads and validates contact service settings from the process environment through the shared configuration loader.
 * Invalid or missing required settings are reported by that loader before service startup.
 *
 * @returns {ContactServiceConfig} Validated contact service settings.
 */
export function loadContactServiceConfig(): ContactServiceConfig {
  return loadConfig<typeof ContactServiceConfigSchema>(ContactServiceConfigSchema);
}
