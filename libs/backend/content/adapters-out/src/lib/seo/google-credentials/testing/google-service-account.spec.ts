import { SeoSourceError } from '@vfortin/content-application';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  GOOGLE_REPORTING_SCOPES,
  GoogleServiceAccountTokens,
  type ServiceAccountKey,
  type TokenClient,
  jwtClient,
} from '@internal/content-adapters-out/lib/seo/google-credentials/google-service-account';

/**
 * Constant KEY_FILE
 *
 * @description
 * Service account key file content with a placeholder key (never exchanged in these tests).
 */
const KEY_FILE: string = JSON.stringify({
  type: 'service_account',
  client_email: 'dashboard@portfolio.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nplaceholder\n-----END PRIVATE KEY-----\n',
});

describe('GoogleServiceAccountTokens', (): void => {
  let directory: string;

  beforeAll((): void => {
    directory = mkdtempSync(join(tmpdir(), 'seo-credentials-'));
  });

  afterAll((): void => {
    rmSync(directory, { recursive: true, force: true });
  });

  /**
   * Function file
   *
   * @description
   * Writes a credentials file of the test directory.
   *
   * @param {string} name - File name.
   * @param {string} content - Content.
   * @returns {string} Path.
   */
  const file = (name: string, content: string): string => {
    const path: string = join(directory, name);
    writeFileSync(path, content);
    return path;
  };

  it('reads the key once, with the reporting scopes, and returns its tokens', async (): Promise<void> => {
    const created: { key: ServiceAccountKey; scopes: readonly string[] }[] = [];
    const client: TokenClient = { getAccessToken: vi.fn(async () => ({ token: 'ya29.token' })) };
    const tokens: GoogleServiceAccountTokens = new GoogleServiceAccountTokens(
      file('valid.json', KEY_FILE),
      GOOGLE_REPORTING_SCOPES,
      (key: ServiceAccountKey, scopes: readonly string[]): TokenClient => {
        created.push({ key, scopes });
        return client;
      },
    );
    expect(await tokens.token()).toBe('ya29.token');
    expect(await tokens.token()).toBe('ya29.token');
    expect(created).toEqual([
      {
        key: {
          email: 'dashboard@portfolio.iam.gserviceaccount.com',
          key: '-----BEGIN PRIVATE KEY-----\nplaceholder\n-----END PRIVATE KEY-----\n',
        },
        scopes: [
          'https://www.googleapis.com/auth/webmasters.readonly',
          'https://www.googleapis.com/auth/analytics.readonly',
        ],
      },
    ]);
  });

  it.each([
    ['an absent file', null, 'credentials-missing'],
    ['an empty file', ' \n', 'credentials-missing'],
    ['a file that is not JSON', 'type=service_account', 'credentials-invalid'],
    [
      'an OAuth client file',
      JSON.stringify({ installed: { client_id: 'x' } }),
      'credentials-invalid',
    ],
  ])(
    'refuses %s',
    async (_label: string, content: string | null, reason: string): Promise<void> => {
      const path: string =
        content === null ? join(directory, 'absent.json') : file('bad.json', content);
      const error: unknown = await new GoogleServiceAccountTokens(path)
        .token()
        .catch((rejection: unknown): unknown => rejection);
      expect(error).toBeInstanceOf(SeoSourceError);
      expect((error as SeoSourceError).reason).toBe(reason);
    },
  );

  it('reports a refused key, an unreachable endpoint and an empty answer', async (): Promise<void> => {
    const path: string = file('valid.json', KEY_FILE);
    const failing = (failure: unknown): GoogleServiceAccountTokens =>
      new GoogleServiceAccountTokens(path, GOOGLE_REPORTING_SCOPES, (): TokenClient => ({
        getAccessToken: async (): Promise<{ token?: string | null }> => {
          throw failure;
        },
      }));
    await expect(
      failing({ response: { status: 400, data: { error: 'invalid_grant' } } }).token(),
    ).rejects.toMatchObject({
      reason: 'credentials-rejected',
      message: 'Google refused the service account key (invalid_grant).',
    });
    await expect(
      failing({ response: { status: 401, data: 'html' } }).token(),
    ).rejects.toMatchObject({
      message: 'Google refused the service account key.',
    });
    await expect(failing(new Error('ECONNRESET')).token()).rejects.toMatchObject({
      reason: 'network',
    });
    const empty: GoogleServiceAccountTokens = new GoogleServiceAccountTokens(
      path,
      GOOGLE_REPORTING_SCOPES,
      (): TokenClient => ({ getAccessToken: async () => ({ token: null }) }),
    );
    await expect(empty.token()).rejects.toMatchObject({ reason: 'credentials-rejected' });
  });

  it('creates a google-auth-library JWT client for the key', (): void => {
    const client: TokenClient = jwtClient(
      { email: 'dashboard@portfolio.iam.gserviceaccount.com', key: 'pem' },
      GOOGLE_REPORTING_SCOPES,
    );
    expect(typeof client.getAccessToken).toBe('function');
  });
});
