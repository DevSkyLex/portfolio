import { readFileSync } from 'node:fs';
import type { z } from 'zod';

/**
 * Class ConfigError
 * @class ConfigError
 *
 * @description
 * Carries all environment validation issues so startup can report every invalid variable together.
 */
export class ConfigError extends Error {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates a startup configuration error containing every collected issue.
   *
   * @param {readonly string[]} issues - Configuration paths and reasons to expose in the error message.
   */
  public constructor(public readonly issues: readonly string[]) {
    super(
      `Invalid configuration:\n${issues.map((issue: string): string => `  - ${issue}`).join('\n')}`,
    );
    this.name = 'ConfigError';
  }
  // #endregion
}

/**
 * Function resolveSecretFiles
 *
 * @description
 * Resolves Docker's `X_FILE` convention into `X`, preserving explicit environment values and removing one trailing newline.
 * An unreadable referenced file raises `ConfigError` with the variable name and path.
 *
 * @param {Record<string, string | undefined>} env - Environment values to resolve without mutating the input record.
 * @param {(path: string) => string} read - File reader used for secret paths; defaults to UTF-8 disk reads.
 * @returns {Record<string, string | undefined>} A shallow copy with eligible secret-file values populated.
 */
export function resolveSecretFiles(
  env: Record<string, string | undefined>,
  read: (path: string) => string = (path: string): string => readFileSync(path, 'utf8'),
): Record<string, string | undefined> {
  const resolved: { [x: string]: string | undefined } = { ...env };
  for (const [key, path] of Object.entries(env)) {
    const name: string | null = key.endsWith('_FILE') ? key.slice(0, -'_FILE'.length) : null;
    if (name && path && resolved[name] === undefined) {
      try {
        resolved[name] = read(path).replace(/\r?\n$/, '');
      } catch {
        throw new ConfigError([`${key}: unreadable file (${path})`]);
      }
    }
  }
  return resolved;
}

/**
 * Function loadConfig
 *
 * @description
 * Resolves secret-file references and validates the resulting environment against the supplied Zod schema.
 * Invalid paths are aggregated into `ConfigError`; defaults apply only when declared by the schema.
 *
 * @template TSchema - Zod schema defining the configuration shape and inferred output.
 * @param {TSchema} schema - Schema used to parse the resolved environment.
 * @param {Record<string, string | undefined>} env - Environment record; defaults to `process.env`.
 * @returns {z.infer<TSchema>} Parsed configuration with schema coercions applied.
 */
export function loadConfig<TSchema extends z.ZodType>(
  schema: TSchema,
  env: Record<string, string | undefined> = process.env,
): z.infer<TSchema> {
  const result: z.ZodSafeParseResult<z.core.output<TSchema>> = schema.safeParse(
    resolveSecretFiles(env),
  );
  if (!result.success) {
    throw new ConfigError(
      result.error.issues.map(
        (issue: z.core.$ZodIssue): string =>
          `${issue.path.join('.') || '(root)'}: ${issue.message}`,
      ),
    );
  }
  return result.data;
}
