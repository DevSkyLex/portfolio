import { OAuthError } from '@internal/identity-domain/lib/errors/domain-error';
import {
  MAX_URI_LENGTH,
  assertRedirectUri,
  hostOf,
  redirectUriMatches,
} from '@internal/identity-domain/lib/oauth/redirect-uri/redirect-uri';

/**
 * Type OAuthClientKind
 * @type OAuthClientKind
 *
 * @description
 * How the client is known: a Client ID Metadata Document fetched from its `https` client identifier,
 * or a dynamic registration (RFC 7591), deprecated by MCP and kept for older clients.
 */
export type OAuthClientKind = 'metadata-document' | 'dynamic';

/**
 * Constant MAX_REDIRECT_URIS
 *
 * @description
 * Most redirect URIs one client may register.
 *
 * @type {number}
 */
export const MAX_REDIRECT_URIS = 10 as const;

/**
 * Constant MAX_CLIENT_NAME_LENGTH
 *
 * @description
 * Longest accepted `client_name`, in characters, shown on the consent screen.
 *
 * @type {number}
 */
export const MAX_CLIENT_NAME_LENGTH = 100 as const;

/**
 * Constant SUPPORTED_GRANT_TYPES
 *
 * @description
 * Grant types a client may declare; `authorization_code` must be one of them.
 *
 * @type {readonly string[]}
 */
const SUPPORTED_GRANT_TYPES: readonly string[] = ['authorization_code', 'refresh_token'];

/**
 * Interface OAuthClientProps
 * @interface OAuthClientProps
 *
 * @description
 * Persisted client state: identity, display metadata, the redirect URIs it registered and, for a
 * metadata document, how long the fetched copy stays fresh.
 */
export interface OAuthClientProps {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * `client_id`: the document URL of a metadata-document client, a generated identifier otherwise.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property kind
   * @readonly
   *
   * @description
   * Registration mechanism.
   *
   * @type {OAuthClientKind}
   */
  readonly kind: OAuthClientKind;

  /**
   * Property name
   * @readonly
   *
   * @description
   * `client_name`, `null` when a dynamic registration gave none.
   *
   * @type {string | null}
   */
  readonly name: string | null;

  /**
   * Property clientUri
   * @readonly
   *
   * @description
   * `client_uri` (an `https` home page), or `null`.
   *
   * @type {string | null}
   */
  readonly clientUri: string | null;

  /**
   * Property logoUri
   * @readonly
   *
   * @description
   * `logo_uri` (`https`), or `null`.
   *
   * @type {string | null}
   */
  readonly logoUri: string | null;

  /**
   * Property logo
   * @readonly
   *
   * @description
   * Logo fetched by the server as a `data:` URL (the admin CSP allows no other image origin), or `null`.
   *
   * @type {string | null}
   */
  readonly logo: string | null;

  /**
   * Property logoFetchedAt
   * @readonly
   *
   * @description
   * Last attempt to fetch the logo, `null` before the first one; a failed attempt is not repeated
   * until the metadata is fetched again.
   *
   * @type {Date | null}
   */
  readonly logoFetchedAt: Date | null;

  /**
   * Property redirectUris
   * @readonly
   *
   * @description
   * Registered redirect URIs, compared with `redirectUriMatches`.
   *
   * @type {readonly string[]}
   */
  readonly redirectUris: readonly string[];

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * First registration or fetch.
   *
   * @type {Date}
   */
  readonly createdAt: Date;

  /**
   * Property metadataExpiresAt
   * @readonly
   *
   * @description
   * Instant from which a metadata document is fetched again; `null` for a dynamic registration.
   *
   * @type {Date | null}
   */
  readonly metadataExpiresAt: Date | null;
  // #endregion
}

/**
 * Interface ClientMetadata
 * @interface ClientMetadata
 *
 * @description
 * Validated subset of RFC 7591 client metadata shared by both registration mechanisms.
 */
interface ClientMetadata {
  // #region Properties
  /** `client_name`, trimmed. */
  readonly name: string | null;
  /** `client_uri`. */
  readonly clientUri: string | null;
  /** `logo_uri`. */
  readonly logoUri: string | null;
  /** `redirect_uris`. */
  readonly redirectUris: readonly string[];
  // #endregion
}

/**
 * Function invalidMetadata
 *
 * @description
 * Builds the RFC 7591 refusal of a metadata field.
 *
 * @param {string} description - What is wrong.
 *
 * @returns {OAuthError} `invalid_client_metadata` error.
 */
function invalidMetadata(description: string): OAuthError {
  return new OAuthError('invalid_client_metadata', description);
}

/**
 * Function optionalHttpsUri
 *
 * @description
 * Reads an optional `https` URI field (`client_uri`, `logo_uri`).
 *
 * @param {Record<string, unknown>} metadata - Client metadata.
 * @param {string} field - Field name.
 *
 * @returns {string | null} The URI, or `null` when absent.
 *
 * @throws {OAuthError} `invalid_client_metadata` for a non-string, over-long or non-https value.
 */
function optionalHttpsUri(metadata: Record<string, unknown>, field: string): string | null {
  const value: unknown = metadata[field];
  if (value === undefined || value === null) {
    return null;
  }
  if (
    typeof value !== 'string' ||
    value.length > MAX_URI_LENGTH ||
    !value.startsWith('https://') ||
    !URL.canParse(value)
  ) {
    throw invalidMetadata(`${field} must be an https URI.`);
  }
  return value;
}

/**
 * Function stringList
 *
 * @description
 * Reads an optional array of strings.
 *
 * @param {Record<string, unknown>} metadata - Client metadata.
 * @param {string} field - Field name.
 *
 * @returns {readonly string[] | null} The list, or `null` when absent.
 *
 * @throws {OAuthError} `invalid_client_metadata` when the field is not an array of strings.
 */
function stringList(metadata: Record<string, unknown>, field: string): readonly string[] | null {
  const value: unknown = metadata[field];
  if (value === undefined) {
    return null;
  }
  if (!Array.isArray(value) || !value.every((item: unknown): boolean => typeof item === 'string')) {
    throw invalidMetadata(`${field} must be an array of strings.`);
  }
  return value as readonly string[];
}

/**
 * Function parseClientMetadata
 *
 * @description
 * Validates the metadata both mechanisms share: a JSON object; a public client (no secret,
 * `token_endpoint_auth_method` absent or `none`); `authorization_code` among the grant types and only
 * `code` as response type; one to `MAX_REDIRECT_URIS` redirect URIs passing `assertRedirectUri`;
 * optional `client_name`, `client_uri` and `logo_uri`. Other fields are ignored.
 *
 * @param {unknown} input - Parsed JSON body or document.
 * @param {boolean} nameRequired - Whether `client_name` is mandatory (metadata documents).
 *
 * @returns {ClientMetadata} Validated metadata.
 *
 * @throws {OAuthError} `invalid_client_metadata` or `invalid_redirect_uri`.
 */
function parseClientMetadata(input: unknown, nameRequired: boolean): ClientMetadata {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw invalidMetadata('Client metadata must be a JSON object.');
  }
  const metadata: Record<string, unknown> = input as Record<string, unknown>;
  if (
    metadata['client_secret'] !== undefined ||
    metadata['client_secret_expires_at'] !== undefined
  ) {
    throw invalidMetadata('Only public clients are supported: no client secret.');
  }
  const method: unknown = metadata['token_endpoint_auth_method'];
  if (method !== undefined && method !== 'none') {
    throw invalidMetadata('token_endpoint_auth_method must be none (public clients only).');
  }
  const grants: readonly string[] | null = stringList(metadata, 'grant_types');
  if (
    grants !== null &&
    (!grants.includes('authorization_code') ||
      grants.some((grant: string): boolean => !SUPPORTED_GRANT_TYPES.includes(grant)))
  ) {
    throw invalidMetadata('grant_types must include authorization_code and refresh_token only.');
  }
  const responses: readonly string[] | null = stringList(metadata, 'response_types');
  if (responses !== null && responses.some((type: string): boolean => type !== 'code')) {
    throw invalidMetadata('response_types must be code.');
  }
  const redirects: readonly string[] | null = stringList(metadata, 'redirect_uris');
  if (redirects === null || redirects.length === 0 || redirects.length > MAX_REDIRECT_URIS) {
    throw new OAuthError(
      'invalid_redirect_uri',
      `Between 1 and ${MAX_REDIRECT_URIS} redirect URIs are required.`,
    );
  }
  redirects.forEach((uri: string): string => assertRedirectUri(uri));
  const rawName: unknown = metadata['client_name'];
  const name: string | null = typeof rawName === 'string' ? rawName.trim() : null;
  if (
    (rawName !== undefined && typeof rawName !== 'string') ||
    (name !== null && (name.length === 0 || name.length > MAX_CLIENT_NAME_LENGTH)) ||
    (nameRequired && name === null)
  ) {
    throw invalidMetadata(`client_name must hold 1 to ${MAX_CLIENT_NAME_LENGTH} characters.`);
  }
  return {
    name,
    clientUri: optionalHttpsUri(metadata, 'client_uri'),
    logoUri: optionalHttpsUri(metadata, 'logo_uri'),
    redirectUris: [...new Set<string>(redirects)],
  };
}

/**
 * Function assertMetadataDocumentUrl
 *
 * @description
 * Checks a Client ID Metadata Document identifier (draft-ietf-oauth-client-id-metadata-document §3):
 * `https`, a path beyond `/`, no fragment, user information or dot segments, at most `MAX_URI_LENGTH`,
 * and already in the canonical form the URL parser gives, since the document's `client_id` must
 * equal it by simple string comparison.
 *
 * @param {string} clientId - Presented client identifier.
 *
 * @returns {URL} Parsed identifier.
 *
 * @throws {OAuthError} `invalid_client` when a rule fails.
 */
export function assertMetadataDocumentUrl(clientId: string): URL {
  let url: URL | null = null;
  try {
    url = clientId.length <= MAX_URI_LENGTH ? new URL(clientId) : null;
  } catch {
    url = null;
  }
  if (
    url === null ||
    url.protocol !== 'https:' ||
    url.href !== clientId ||
    url.pathname === '/' ||
    url.hash !== '' ||
    url.username !== '' ||
    url.password !== ''
  ) {
    throw new OAuthError('invalid_client', 'The client identifier is not a valid metadata URL.');
  }
  return url;
}

/**
 * Function isMetadataDocumentClientId
 *
 * @description
 * Whether a client identifier designates a metadata document (an `https` URL) rather than a dynamic
 * registration.
 *
 * @param {string} clientId - Presented client identifier.
 *
 * @returns {boolean} Whether it must be resolved by fetching.
 */
export function isMetadataDocumentClientId(clientId: string): boolean {
  return clientId.startsWith('https://');
}

/**
 * Class OAuthClient
 * @class OAuthClient
 *
 * @description
 * An MCP client known to the authorization server (D45). Both mechanisms share the metadata rules;
 * only public clients authenticated by PKCE are accepted.
 */
export class OAuthClient {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores validated or persisted state.
   *
   * @param {OAuthClientProps} props - Client state.
   */
  private constructor(private readonly props: OAuthClientProps) {}
  // #endregion

  // #region Methods
  /**
   * Method fromMetadataDocument
   * @method fromMetadataDocument
   * @static
   *
   * @description
   * Builds a client from the document fetched at its identifier, whose `client_id` must equal that
   * URL exactly. Every refusal is `invalid_client`, as the document is the client's registration.
   *
   * @param {string} clientId - Document URL.
   * @param {unknown} document - Parsed JSON document.
   * @param {Date} now - Fetch instant.
   * @param {Date} expiresAt - End of the freshness of this copy.
   * @param {OAuthClient | null} previous - Copy fetched earlier, whose creation time is kept.
   *
   * @returns {OAuthClient} Fresh client state, without a logo until one is fetched.
   *
   * @throws {OAuthError} `invalid_client`.
   */
  public static fromMetadataDocument(
    clientId: string,
    document: unknown,
    now: Date,
    expiresAt: Date,
    previous: OAuthClient | null,
  ): OAuthClient {
    assertMetadataDocumentUrl(clientId);
    let metadata: ClientMetadata;
    try {
      if ((document as { client_id?: unknown } | null)?.client_id !== clientId) {
        throw invalidMetadata('The document client_id must equal its URL.');
      }
      metadata = parseClientMetadata(document, true);
    } catch (error: unknown) {
      throw error instanceof OAuthError
        ? new OAuthError(
            'invalid_client',
            `Client metadata document rejected: ${error.description}`,
          )
        : error;
    }
    return new OAuthClient({
      id: clientId,
      kind: 'metadata-document',
      ...metadata,
      logo: null,
      logoFetchedAt: null,
      createdAt: previous?.createdAt ?? now,
      metadataExpiresAt: expiresAt,
    });
  }

  /**
   * Method register
   * @method register
   *
   * @description
   * Builds a dynamically registered client (RFC 7591) from the posted metadata.
   *
   * @param {string} id - Generated client identifier (never an `https` URL).
   * @param {unknown} metadata - Parsed JSON body.
   * @param {Date} now - Registration instant.
   *
   * @returns {OAuthClient} New client state.
   *
   * @throws {OAuthError} `invalid_client_metadata` or `invalid_redirect_uri`.
   */
  public static register(id: string, metadata: unknown, now: Date): OAuthClient {
    return new OAuthClient({
      id,
      kind: 'dynamic',
      ...parseClientMetadata(metadata, false),
      logo: null,
      logoFetchedAt: null,
      createdAt: now,
      metadataExpiresAt: null,
    });
  }

  /**
   * Method rehydrate
   * @method rehydrate
   * @static
   *
   * @description
   * Restores persisted state as it is.
   *
   * @param {OAuthClientProps} props - Persisted state.
   *
   * @returns {OAuthClient} Restored client.
   */
  public static rehydrate(props: OAuthClientProps): OAuthClient {
    return new OAuthClient(props);
  }

  /**
   * Method id
   * @method id
   *
   * @description
   * Returns the client identifier.
   *
   * @returns {string} `client_id`.
   */
  public get id(): string {
    return this.props.id;
  }

  /**
   * Method kind
   * @method kind
   *
   * @description
   * Returns the registration mechanism.
   *
   * @returns {OAuthClientKind} Mechanism.
   */
  public get kind(): OAuthClientKind {
    return this.props.kind;
  }

  /**
   * Method name
   * @method name
   *
   * @description
   * Returns the display name.
   *
   * @returns {string | null} `client_name`.
   */
  public get name(): string | null {
    return this.props.name;
  }

  /**
   * Method clientUri
   * @method clientUri
   *
   * @description
   * Returns the client home page.
   *
   * @returns {string | null} `client_uri`.
   */
  public get clientUri(): string | null {
    return this.props.clientUri;
  }

  /**
   * Method logo
   * @method logo
   *
   * @description
   * Returns the fetched logo.
   *
   * @returns {string | null} `data:` URL.
   */
  public get logo(): string | null {
    return this.props.logo;
  }

  /**
   * Method redirectUris
   * @method redirectUris
   *
   * @description
   * Returns the registered redirect URIs.
   *
   * @returns {readonly string[]} Redirect URIs.
   */
  public get redirectUris(): readonly string[] {
    return this.props.redirectUris;
  }

  /**
   * Method createdAt
   * @method createdAt
   *
   * @description
   * Returns the first registration or fetch.
   *
   * @returns {Date} Creation instant.
   */
  public get createdAt(): Date {
    return this.props.createdAt;
  }

  /**
   * Method host
   * @method host
   *
   * @description
   * Host the owner recognises the client by: the document URL's for a metadata document, otherwise
   * the home page's or the first redirect URI's (a dynamic identifier is opaque).
   *
   * @returns {string} Host.
   */
  public get host(): string {
    if (this.props.kind === 'metadata-document') {
      return hostOf(this.props.id);
    }
    return hostOf(this.props.clientUri ?? this.props.redirectUris[0] ?? this.props.id);
  }

  /**
   * Method allowsRedirect
   * @method allowsRedirect
   *
   * @description
   * Whether a presented redirect URI matches one the client registered (`redirectUriMatches`).
   *
   * @param {string} uri - Presented redirect URI.
   *
   * @returns {boolean} Whether the authorization server may send the browser there.
   */
  public allowsRedirect(uri: string): boolean {
    return this.props.redirectUris.some((registered: string): boolean =>
      redirectUriMatches(registered, uri),
    );
  }

  /**
   * Method isStale
   * @method isStale
   *
   * @description
   * Whether a metadata document must be fetched again before use; never for a dynamic client.
   *
   * @param {Date} now - Current time.
   *
   * @returns {boolean} Whether the cached copy expired.
   */
  public isStale(now: Date): boolean {
    return (
      this.props.metadataExpiresAt !== null &&
      this.props.metadataExpiresAt.getTime() <= now.getTime()
    );
  }

  /**
   * Method needsLogo
   * @method needsLogo
   *
   * @description
   * Whether the logo should be fetched: the client declares one and no attempt was made since the
   * metadata was (re)validated.
   *
   * @returns {boolean} Whether to fetch the logo.
   */
  public needsLogo(): boolean {
    return this.props.logoUri !== null && this.props.logoFetchedAt === null;
  }

  /**
   * Method logoUri
   * @method logoUri
   *
   * @description
   * Returns the declared logo address.
   *
   * @returns {string | null} `logo_uri`.
   */
  public get logoUri(): string | null {
    return this.props.logoUri;
  }

  /**
   * Method withLogo
   * @method withLogo
   *
   * @description
   * Records the outcome of a logo fetch.
   *
   * @param {string | null} logo - `data:` URL, or `null` when the fetch failed.
   * @param {Date} now - Attempt instant.
   *
   * @returns {OAuthClient} Updated client.
   */
  public withLogo(logo: string | null, now: Date): OAuthClient {
    return new OAuthClient({ ...this.props, logo, logoFetchedAt: now });
  }

  /**
   * Method snapshot
   * @method snapshot
   *
   * @description
   * Returns a shallow copy for persistence.
   *
   * @returns {OAuthClientProps} Client state.
   */
  public snapshot(): OAuthClientProps {
    return { ...this.props };
  }
  // #endregion
}
