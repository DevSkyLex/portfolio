import { loadConfig } from '@vfortin/backend-config';
import { z } from 'zod';

/**
 * Function optional
 *
 * @description
 * Treats an empty Compose-substituted environment value as absent before applying the optional schema.
 *
 * @template T - Zod schema type retained by the optional wrapper.
 * @param {T} schema - Schema used to validate a present non-empty value.
 * @returns {z.ZodPreprocess<z.ZodOptional<T>, unknown>} Schema accepting the original value or an absent value.
 */
const optional = <T extends z.ZodType>(schema: T): z.ZodPreprocess<z.ZodOptional<T>, unknown> =>
  z.preprocess((value: unknown): unknown => (value === '' ? undefined : value), schema.optional());

/**
 * Constant ContentServiceConfigSchema
 *
 * @description
 * Validates content service environment values and requires a workflow token whenever a rebuild repository is configured.
 */
const ContentServiceConfigSchema = z
  .object({
    CONTENT_PORT: z.coerce.number().int().positive().default(3101),
    /** `postgres://…` in production; `pglite:<directory>` or `pglite:memory` without Docker. */
    CONTENT_DATABASE_URL: z.string().min(1),
    /** Drizzle migrations directory; defaults to the one copied next to the bundle. */
    CONTENT_MIGRATIONS_DIR: z.string().min(1).optional(),
    /** Issuer of the admin tokens and JWKS of the identity service (internal network). */
    AUTH_ISSUER: z.url(),
    AUTH_JWKS_URL: z.url(),
    /** Site rebuild through a GitHub workflow; absent: the request is only logged. */
    SITE_BUILD_REPOSITORY: optional(z.string().regex(/^[\w.-]+\/[\w.-]+$/)),
    SITE_BUILD_WORKFLOW: z.string().default('site-build.yml'),
    SITE_BUILD_REF: z.string().default('main'),
    SITE_BUILD_TOKEN: optional(z.string().min(20)),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  })
  // A repository without its token would silently turn rebuilds into log lines.
  .refine(
    (config): boolean =>
      config.SITE_BUILD_REPOSITORY === undefined || config.SITE_BUILD_TOKEN !== undefined,
    {
      path: ['SITE_BUILD_TOKEN'],
      message: 'required when SITE_BUILD_REPOSITORY is set',
    },
  );

/**
 * Type ContentServiceConfig
 * @type ContentServiceConfig
 *
 * @description
 * Runtime-validated settings consumed by content service composition and publication jobs.
 */
export type ContentServiceConfig = z.infer<typeof ContentServiceConfigSchema>;

/**
 * Function loadContentServiceConfig
 *
 * @description
 * Loads and validates content service settings from the provided environment, defaulting to the process environment.
 *
 * @param {Record<string, string | undefined>} env - Environment values to validate.
 * @returns {ContentServiceConfig} Validated content service settings.
 */
export function loadContentServiceConfig(
  env: Record<string, string | undefined> = process.env,
): ContentServiceConfig {
  return loadConfig<typeof ContentServiceConfigSchema>(ContentServiceConfigSchema, env);
}
