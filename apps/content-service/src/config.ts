import { ConfigError, loadConfig } from '@vfortin/backend-config';
import type { ContentSeoOptions } from '@vfortin/content-composition';
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
    /**
     * Directory of the uploaded media (D40); required by the HTTP service in production (see
     * `mediaDirectory`), unused by the migrate and seed commands.
     */
    CONTENT_MEDIA_DIR: optional(z.string().min(1)),
    /** Serve `/media/` from the service, for `nx serve` behind the Angular proxy; Nginx serves it otherwise. */
    CONTENT_MEDIA_SERVE: z.preprocess(
      (value: unknown): unknown => (value === '' ? undefined : value),
      z.stringbool().default(false),
    ),
    /** Public origin of the site, for the default Web Vitals URLs of the SEO dashboard (D47). */
    SEO_SITE_ORIGIN: z
      .string()
      .regex(/^https?:\/\/[^/\s]+\/?$/)
      .default('https://valentin-fortin.pro')
      .transform((origin: string): string => origin.replace(/\/$/, '')),
    /**
     * Google service account key file (a Docker secret), read by the dashboard on first use only;
     * deliberately not a `_FILE` variable, which would read it at startup.
     */
    SEO_GOOGLE_CREDENTIALS_PATH: optional(z.string().min(1)),
    /** Search Console property: `sc-domain:<domain>` or a URL prefix ending with `/`. */
    SEO_SEARCH_CONSOLE_PROPERTY: optional(
      z.string().regex(/^(?:sc-domain:[a-z0-9.-]+\.[a-z]{2,}|https?:\/\/\S+\/)$/),
    ),
    /** Numeric GA4 property identifier (Admin › Property details), not the `G-` measurement id. */
    SEO_GA4_PROPERTY_ID: optional(z.string().regex(/^\d{6,12}$/)),
    /** PageSpeed Insights API key, from `SEO_PAGESPEED_API_KEY_FILE` in production. */
    SEO_PAGESPEED_API_KEY: optional(z.string().regex(/^[\w-]{20,100}$/)),
    /** Key URLs measured by PageSpeed Insights, comma-separated; default: home FR/EN and a project. */
    SEO_WEB_VITALS_URLS: optional(
      z
        .string()
        .transform((value: string): string[] =>
          value
            .split(',')
            .map((url: string): string => url.trim())
            .filter((url: string): boolean => url !== ''),
        )
        .pipe(z.array(z.url({ protocol: /^https$/ })).max(10)),
    ),
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
 * Constant DEVELOPMENT_MEDIA_DIR
 *
 * @description
 * Media directory outside production when `CONTENT_MEDIA_DIR` is absent, next to the development
 * PGlite database (`pglite:.data/content`), relative to the working directory.
 */
export const DEVELOPMENT_MEDIA_DIR: string = '.data/media';

/**
 * Function mediaDirectory
 *
 * @description
 * Resolves the media directory of the HTTP service: `CONTENT_MEDIA_DIR`, required in production, or
 * `DEVELOPMENT_MEDIA_DIR` elsewhere.
 *
 * @param {ContentServiceConfig} config - Validated settings.
 * @throws {ConfigError} When production has no media directory.
 * @returns {string} Media directory.
 */
export function mediaDirectory(config: ContentServiceConfig): string {
  if (config.CONTENT_MEDIA_DIR !== undefined) {
    return config.CONTENT_MEDIA_DIR;
  }
  if (config.NODE_ENV === 'production') {
    throw new ConfigError(['CONTENT_MEDIA_DIR: required in production']);
  }
  return DEVELOPMENT_MEDIA_DIR;
}

/**
 * Function seoDashboardOptions
 *
 * @description
 * Maps the validated settings to the SEO dashboard options of the content module (D47); an absent
 * setting leaves its source `not-configured`.
 *
 * @param {ContentServiceConfig} config - Validated settings.
 * @returns {ContentSeoOptions} Dashboard options.
 */
export function seoDashboardOptions(config: ContentServiceConfig): ContentSeoOptions {
  return {
    siteOrigin: config.SEO_SITE_ORIGIN,
    credentialsPath: config.SEO_GOOGLE_CREDENTIALS_PATH ?? null,
    searchConsoleProperty: config.SEO_SEARCH_CONSOLE_PROPERTY ?? null,
    analyticsPropertyId: config.SEO_GA4_PROPERTY_ID ?? null,
    pageSpeedApiKey: config.SEO_PAGESPEED_API_KEY ?? null,
    webVitalsUrls: config.SEO_WEB_VITALS_URLS ?? [],
  };
}

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
