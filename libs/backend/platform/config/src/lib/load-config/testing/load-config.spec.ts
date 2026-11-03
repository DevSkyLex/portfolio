import { z } from 'zod';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ConfigError,
  loadConfig,
  resolveSecretFiles,
} from '@internal/backend-config/lib/load-config/load-config';

/**
 * Constant schema
 *
 * @description
 * Test configuration contract requiring a positive integer port and a non-empty database URL.
 */
const schema: z.ZodObject<
  { PORT: z.ZodCoercedNumber<unknown>; DATABASE_URL: z.ZodString },
  z.core.$strip
> = z.object({
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().min(1),
});

describe('loadConfig', (): void => {
  it('converts and returns valid values', (): void => {
    expect(loadConfig(schema, { PORT: '3001', DATABASE_URL: 'pglite:memory' })).toEqual({
      PORT: 3001,
      DATABASE_URL: 'pglite:memory',
    });
  });

  it('lists every invalid variable', (): void => {
    try {
      loadConfig(schema, { PORT: 'abc' });
      expect.unreachable();
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ConfigError);
      expect(
        (error as ConfigError).issues.map(
          (issue: string): string | undefined => issue.split(': ')[0],
        ),
      ).toEqual(['PORT', 'DATABASE_URL']);
    }
  });
});

describe('resolveSecretFiles', (): void => {
  it('reads X from X_FILE without overriding a direct value', (): void => {
    const files: Record<string, string> = { '/run/secrets/url': 'postgres://x\n' };
    /**
     * Function read
     *
     * @description
     * Reads the in-memory secret fixture and rejects paths absent from the fixture map.
     *
     * @param {string} path - Requested fixture path.
     * @returns {string} Secret file contents associated with the path.
     */
    const read = (path: string): string => {
      const content: string | undefined = files[path];
      if (content === undefined) throw new Error('absent');
      return content;
    };
    expect(resolveSecretFiles({ DATABASE_URL_FILE: '/run/secrets/url' }, read)).toMatchObject({
      DATABASE_URL: 'postgres://x',
    });
    expect(
      resolveSecretFiles({ DATABASE_URL: 'direct', DATABASE_URL_FILE: '/run/secrets/url' }, read),
    ).toMatchObject({ DATABASE_URL: 'direct' });
    expect((): Record<string, string | undefined> =>
      resolveSecretFiles({ TOKEN_FILE: '/absent' }, read),
    ).toThrow(ConfigError);
  });

  it('reads Docker secret files from disk by default', (): void => {
    const folder: string = mkdtempSync(join(tmpdir(), 'secrets-'));
    const path: string = join(folder, 'token');
    writeFileSync(path, 'from-disk\r\n');
    expect(loadConfig(z.object({ TOKEN: z.string() }), { TOKEN_FILE: path })).toEqual({
      TOKEN: 'from-disk',
    });
    rmSync(folder, { recursive: true, force: true });
  });

  it('names the root when the whole input is invalid', (): void => {
    expect((): string => loadConfig(z.string(), {})).toThrow(/\(root\)/);
  });
});
