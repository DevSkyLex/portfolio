import { SeoSourceError } from '@vfortin/content-application';
import { JWT } from 'google-auth-library';
import { readFile } from 'node:fs/promises';
import { field } from '@internal/content-adapters-out/lib/seo/google-http/google-http';

/**
 * Constant GOOGLE_REPORTING_SCOPES
 *
 * @description
 * Read-only scopes of the service account: Search Console and Google Analytics.
 */
export const GOOGLE_REPORTING_SCOPES: readonly string[] = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/analytics.readonly',
];

/**
 * Interface GoogleAccessTokens
 * @interface GoogleAccessTokens
 *
 * @description
 * Source of OAuth access tokens for the Google reporting APIs.
 */
export interface GoogleAccessTokens {
  // #region Methods
  /**
   * Method token
   * @method token
   *
   * @description
   * Returns a valid access token, reusing it until shortly before it expires.
   *
   * @throws {SeoSourceError} When the credentials are missing, invalid or refused.
   * @returns {Promise<string>} Access token.
   */
  token(): Promise<string>;
  // #endregion
}

/**
 * Interface ServiceAccountKey
 * @interface ServiceAccountKey
 *
 * @description
 * Parts of a service account key file the token exchange needs.
 */
export interface ServiceAccountKey {
  // #region Properties
  /**
   * Property email
   * @readonly
   *
   * @description
   * Service account address (`client_email`).
   */
  readonly email: string;

  /**
   * Property key
   * @readonly
   *
   * @description
   * PEM private key (`private_key`).
   */
  readonly key: string;
  // #endregion
}

/**
 * Interface TokenClient
 * @interface TokenClient
 *
 * @description
 * Part of `google-auth-library`'s `JWT` client used here: it signs the assertion, exchanges it and
 * caches the access token.
 */
export interface TokenClient {
  // #region Methods
  /**
   * Method getAccessToken
   * @method getAccessToken
   *
   * @description
   * Returns the cached token or obtains a new one.
   *
   * @returns {Promise<{ token?: string | null }>} Token response.
   */
  getAccessToken(): Promise<{ token?: string | null }>;
  // #endregion
}

/**
 * Type TokenClientFactory
 * @type TokenClientFactory
 *
 * @description
 * Creates the token client of a key; tests replace the `google-auth-library` one.
 */
export type TokenClientFactory = (key: ServiceAccountKey, scopes: readonly string[]) => TokenClient;

/**
 * Function jwtClient
 *
 * @description
 * Creates the `google-auth-library` service account client (JWT bearer grant, RFC 7523).
 *
 * @param {ServiceAccountKey} key - Service account key.
 * @param {readonly string[]} scopes - Requested scopes.
 * @returns {TokenClient} Client.
 */
export function jwtClient(key: ServiceAccountKey, scopes: readonly string[]): TokenClient {
  return new JWT({ email: key.email, key: key.key, scopes: [...scopes] });
}

/**
 * Function parseKey
 *
 * @description
 * Validates the content of a service account key file.
 *
 * @param {string} content - File content.
 * @throws {SeoSourceError} `credentials-missing` for an empty file, `credentials-invalid` for anything
 * but a service account key.
 * @returns {ServiceAccountKey} Key.
 */
function parseKey(content: string): ServiceAccountKey {
  if (content.trim() === '') {
    throw new SeoSourceError('credentials-missing', 'The Google service account file is empty.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new SeoSourceError('credentials-invalid', 'The Google service account file is not JSON.');
  }
  const email: unknown = field(parsed, 'client_email');
  const key: unknown = field(parsed, 'private_key');
  if (
    field(parsed, 'type') !== 'service_account' ||
    typeof email !== 'string' ||
    typeof key !== 'string' ||
    !key.includes('PRIVATE KEY')
  ) {
    throw new SeoSourceError(
      'credentials-invalid',
      'The Google credentials file is not a service account key (type "service_account" with client_email and private_key).',
    );
  }
  return { email, key };
}

/**
 * Class GoogleServiceAccountTokens
 * @class GoogleServiceAccountTokens
 *
 * @description
 * Access tokens of the dashboard's service account (D47). The key file (a Docker secret) is read on
 * the first use only, never at startup, so a missing file only fails the Google sections. The
 * client is kept once the file is valid; a failed read is retried on the next refresh.
 */
export class GoogleServiceAccountTokens implements GoogleAccessTokens {
  // #region Properties
  /**
   * Property client
   *
   * @description
   * Client created from a valid key file, `null` until then.
   */
  private client: TokenClient | null = null;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores where the key is and how tokens are obtained.
   *
   * @param {string} credentialsPath - Path of the service account key file.
   * @param {readonly string[]} scopes - Requested scopes.
   * @param {TokenClientFactory} createClient - Client factory, `google-auth-library` by default.
   * @param {(path: string) => Promise<string>} read - File reader.
   */
  public constructor(
    private readonly credentialsPath: string,
    private readonly scopes: readonly string[] = GOOGLE_REPORTING_SCOPES,
    private readonly createClient: TokenClientFactory = jwtClient,
    private readonly read: (path: string) => Promise<string> = (path: string): Promise<string> =>
      readFile(path, 'utf8'),
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method token
   * @method token
   *
   * @description
   * Returns an access token. Google's refusal of the key (`invalid_grant`, a deleted or disabled
   * service account) and network failures are reported without the assertion or the response.
   *
   * @returns {Promise<string>} Access token.
   */
  public async token(): Promise<string> {
    const client: TokenClient = this.client ?? (await this.load());
    let token: string | null | undefined;
    try {
      token = (await client.getAccessToken()).token;
    } catch (error: unknown) {
      const status: unknown = field(field(error, 'response'), 'status');
      const code: unknown = field(field(field(error, 'response'), 'data'), 'error');
      if (typeof status === 'number' && status >= 400 && status < 500) {
        throw new SeoSourceError(
          'credentials-rejected',
          `Google refused the service account key${typeof code === 'string' && /^[a-z_]{1,40}$/.test(code) ? ` (${code})` : ''}.`,
        );
      }
      throw new SeoSourceError('network', 'The Google token endpoint could not be reached.');
    }
    if (!token) {
      throw new SeoSourceError('credentials-rejected', 'Google returned no access token.');
    }
    return token;
  }

  /**
   * Method load
   * @method load
   *
   * @description
   * Reads and validates the key file, then creates the client.
   *
   * @returns {Promise<TokenClient>} Client.
   */
  private async load(): Promise<TokenClient> {
    let content: string;
    try {
      content = await this.read(this.credentialsPath);
    } catch {
      throw new SeoSourceError(
        'credentials-missing',
        'The Google service account file cannot be read (SEO_GOOGLE_CREDENTIALS_PATH).',
      );
    }
    this.client = this.createClient(parseKey(content), this.scopes);
    return this.client;
  }
  // #endregion
}
