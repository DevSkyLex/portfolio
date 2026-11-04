import type {
  AuthorizationCode,
  AuthorizationRequest,
  OAuthClient,
  OAuthGrant,
  OAuthScope,
  OAuthTokenFamily,
  RefreshToken,
} from '@vfortin/identity-domain';
import type { AccessToken } from '@internal/identity-application/lib/ports/identity/identity.ports';

/**
 * Interface OAuthClientRepository
 * @interface OAuthClientRepository
 *
 * @description
 * Persistence of the clients known to the authorization server: dynamic registrations and the
 * cached copies of fetched metadata documents.
 */
export interface OAuthClientRepository {
  // #region Methods
  /**
   * Method findById
   * @method findById
   *
   * @description
   * Loads a client by its identifier, stale or not.
   *
   * @param {string} id - `client_id`.
   *
   * @returns {Promise<OAuthClient | null>} Client, or `null` when unknown.
   */
  findById(id: string): Promise<OAuthClient | null>;

  /**
   * Method save
   * @method save
   *
   * @description
   * Inserts the client or replaces its stored metadata (a document fetched again).
   *
   * @param {OAuthClient} client - Client state.
   *
   * @returns {Promise<void>} Completion after persistence.
   */
  save(client: OAuthClient): Promise<void>;

  /**
   * Method countDynamicSince
   * @method countDynamicSince
   *
   * @description
   * Counts dynamic registrations created at or after `since`, to cap the registration rate.
   *
   * @param {Date} since - Window start.
   *
   * @returns {Promise<number>} Registrations in the window.
   */
  countDynamicSince(since: Date): Promise<number>;

  /**
   * Method deleteAbandonedDynamic
   * @method deleteAbandonedDynamic
   *
   * @description
   * Deletes dynamic registrations created before `before` that never received a consent.
   *
   * @param {Date} before - Creation cutoff.
   *
   * @returns {Promise<number>} Deleted registrations.
   */
  deleteAbandonedDynamic(before: Date): Promise<number>;
  // #endregion
}

/**
 * Interface ConnectedApplicationRecord
 * @interface ConnectedApplicationRecord
 *
 * @description
 * Active grant with the client it was given to, as listed for the owner.
 */
export interface ConnectedApplicationRecord {
  // #region Properties
  /** Active consent. */
  readonly grant: OAuthGrant;
  /** Consented client. */
  readonly client: OAuthClient;
  // #endregion
}

/**
 * Interface OAuthGrantRepository
 * @interface OAuthGrantRepository
 *
 * @description
 * Persistence of the owner's consents; locks serialize a consent, a revocation and the token
 * issuance that checks the grant is still active.
 */
export interface OAuthGrantRepository {
  // #region Methods
  /**
   * Method lockActive
   * @method lockActive
   *
   * @description
   * Reads and locks the active grant of an account to a client until the transaction completes.
   *
   * @param {string} accountId - Administrator.
   * @param {string} clientId - Client.
   *
   * @returns {Promise<OAuthGrant | null>} Active grant, or `null`.
   */
  lockActive(accountId: string, clientId: string): Promise<OAuthGrant | null>;

  /**
   * Method findById
   * @method findById
   *
   * @description
   * Reads a grant without a lock. A refresh uses it: it already holds its family lock, and a
   * revocation locks the grant before the families, so the refresh must not wait on the grant.
   *
   * @param {string} id - Grant identifier.
   *
   * @returns {Promise<OAuthGrant | null>} Grant, or `null` when unknown.
   */
  findById(id: string): Promise<OAuthGrant | null>;

  /**
   * Method lockById
   * @method lockById
   *
   * @description
   * Reads and locks a grant, active or revoked, until the transaction completes. Lock order: a
   * request or a code first, then its grant, then the grant's families.
   *
   * @param {string} id - Grant identifier.
   *
   * @returns {Promise<OAuthGrant | null>} Grant, or `null` when unknown.
   */
  lockById(id: string): Promise<OAuthGrant | null>;

  /**
   * Method add
   * @method add
   *
   * @description
   * Inserts a new grant.
   *
   * @param {OAuthGrant} grant - Grant state.
   *
   * @returns {Promise<void>} Completion after persistence.
   */
  add(grant: OAuthGrant): Promise<void>;

  /**
   * Method save
   * @method save
   *
   * @description
   * Updates the scopes, update and revocation instants of a grant read under its lock.
   *
   * @param {OAuthGrant} grant - Updated state.
   *
   * @returns {Promise<void>} Completion after persistence.
   */
  save(grant: OAuthGrant): Promise<void>;

  /**
   * Method listActive
   * @method listActive
   *
   * @description
   * Lists the active grants of an account with their clients, most recent consent first.
   *
   * @param {string} accountId - Administrator.
   *
   * @returns {Promise<readonly ConnectedApplicationRecord[]>} Connected applications.
   */
  listActive(accountId: string): Promise<readonly ConnectedApplicationRecord[]>;
  // #endregion
}

/**
 * Interface AuthorizationRequestRepository
 * @interface AuthorizationRequestRepository
 *
 * @description
 * Persistence of the requests waiting for the owner's decision.
 */
export interface AuthorizationRequestRepository {
  // #region Methods
  /**
   * Method add
   * @method add
   *
   * @description
   * Inserts a pending request.
   *
   * @param {AuthorizationRequest} request - Request state.
   *
   * @returns {Promise<void>} Completion after persistence.
   */
  add(request: AuthorizationRequest): Promise<void>;

  /**
   * Method lockById
   * @method lockById
   *
   * @description
   * Reads and locks a request until the transaction completes, so two decisions of the same request
   * are serialized and the second sees the first.
   *
   * @param {string} id - Request identifier.
   *
   * @returns {Promise<AuthorizationRequest | null>} Request, or `null` when unknown.
   */
  lockById(id: string): Promise<AuthorizationRequest | null>;

  /**
   * Method save
   * @method save
   *
   * @description
   * Records the decision instant.
   *
   * @param {AuthorizationRequest} request - Decided request.
   *
   * @returns {Promise<void>} Completion after persistence.
   */
  save(request: AuthorizationRequest): Promise<void>;

  /**
   * Method deleteExpired
   * @method deleteExpired
   *
   * @description
   * Deletes the requests whose expiry is at or before `now`.
   *
   * @param {Date} now - Expiry cutoff.
   *
   * @returns {Promise<number>} Deleted requests.
   */
  deleteExpired(now: Date): Promise<number>;
  // #endregion
}

/**
 * Interface AuthorizationCodeRepository
 * @interface AuthorizationCodeRepository
 *
 * @description
 * Persistence of the hashed authorization codes.
 */
export interface AuthorizationCodeRepository {
  // #region Methods
  /**
   * Method add
   * @method add
   *
   * @description
   * Inserts an issued code (its hash only).
   *
   * @param {AuthorizationCode} code - Code state.
   *
   * @returns {Promise<void>} Completion after persistence.
   */
  add(code: AuthorizationCode): Promise<void>;

  /**
   * Method lockByHash
   * @method lockByHash
   *
   * @description
   * Reads and locks a code by its hash until the transaction completes, so concurrent redemptions are
   * serialized: the second sees the first as consumed.
   *
   * @param {string} codeHash - Hash of the presented code.
   *
   * @returns {Promise<AuthorizationCode | null>} Code, or `null` when unknown.
   */
  lockByHash(codeHash: string): Promise<AuthorizationCode | null>;

  /**
   * Method consume
   * @method consume
   *
   * @description
   * Marks the code redeemed and records the family it opened, only while it is unused.
   *
   * @param {string} id - Code identifier.
   * @param {string} familyId - Family opened by the redemption.
   * @param {Date} now - Redemption instant.
   *
   * @returns {Promise<boolean>} `true` when marked, `false` when already consumed.
   */
  consume(id: string, familyId: string, now: Date): Promise<boolean>;

  /**
   * Method deleteExpired
   * @method deleteExpired
   *
   * @description
   * Deletes the codes whose expiry is at or before `cutoff`. Callers pass an instant well before now:
   * a consumed code is kept a while so that its replay still revokes the tokens it gave.
   *
   * @param {Date} cutoff - Expiry cutoff.
   *
   * @returns {Promise<number>} Deleted codes.
   */
  deleteExpired(cutoff: Date): Promise<number>;
  // #endregion
}

/**
 * Interface LockedTokenFamily
 * @interface LockedTokenFamily
 *
 * @description
 * Family state read under its row lock.
 */
export interface LockedTokenFamily extends OAuthTokenFamily {
  // #region Properties
  /** Revocation instant, `null` while active. */
  readonly revokedAt: Date | null;
  // #endregion
}

/**
 * Interface OAuthTokenRepository
 * @interface OAuthTokenRepository
 *
 * @description
 * Persistence of the MCP refresh tokens and their families, with the locking and conditional
 * rotation of the administrator sessions (D27), in separate tables.
 */
export interface OAuthTokenRepository {
  // #region Methods
  /**
   * Method addFamily
   * @method addFamily
   *
   * @description
   * Inserts the family opened by a code redemption.
   *
   * @param {OAuthTokenFamily} family - New family.
   *
   * @returns {Promise<void>} Completion after persistence.
   */
  addFamily(family: OAuthTokenFamily): Promise<void>;

  /**
   * Method lockFamily
   * @method lockFamily
   *
   * @description
   * Locks a family until the transaction completes, so rotation, replay detection, revocation and
   * grant revocation cannot issue a descendant of a revoked family.
   *
   * @param {string} id - Family identifier.
   *
   * @returns {Promise<LockedTokenFamily | null>} Family, or `null` when it no longer exists.
   */
  lockFamily(id: string): Promise<LockedTokenFamily | null>;

  /**
   * Method add
   * @method add
   *
   * @description
   * Inserts a refresh token (its hash only).
   *
   * @param {RefreshToken} token - Token state.
   *
   * @returns {Promise<void>} Completion after persistence.
   */
  add(token: RefreshToken): Promise<void>;

  /**
   * Method findByHash
   * @method findByHash
   *
   * @description
   * Loads a token by hash, projecting the family's revocation onto it.
   *
   * @param {string} tokenHash - Hash of the presented token.
   *
   * @returns {Promise<RefreshToken | null>} Token, or `null` when unknown.
   */
  findByHash(tokenHash: string): Promise<RefreshToken | null>;

  /**
   * Method markRotated
   * @method markRotated
   *
   * @description
   * Marks a token replaced in one conditional update, only while it is unspent in an active family.
   *
   * @param {string} tokenHash - Token hash.
   * @param {Date} now - Rotation instant.
   *
   * @returns {Promise<boolean>} `true` when marked, `false` when already spent.
   */
  markRotated(tokenHash: string, now: Date): Promise<boolean>;

  /**
   * Method revokeFamily
   * @method revokeFamily
   *
   * @description
   * Revokes a family and its tokens, recording why.
   *
   * @param {string} id - Family identifier.
   * @param {Date} now - Revocation instant.
   * @param {string} reason - `replay`, `client` (RFC 7009) or `owner`.
   *
   * @returns {Promise<void>} Completion after revocation.
   */
  revokeFamily(id: string, now: Date, reason: string): Promise<void>;

  /**
   * Method touchFamily
   * @method touchFamily
   *
   * @description
   * Records the latest use of a family whose lock is held (the "last use" of its grant).
   *
   * @param {string} id - Family identifier.
   * @param {Date} now - Use instant.
   *
   * @returns {Promise<void>} Completion after the update.
   */
  touchFamily(id: string, now: Date): Promise<void>;

  /**
   * Method revokeByGrant
   * @method revokeByGrant
   *
   * @description
   * Revokes every active family issued under a grant.
   *
   * @param {string} grantId - Grant identifier.
   * @param {Date} now - Revocation instant.
   * @param {string} reason - Revocation reason.
   *
   * @returns {Promise<number>} Revoked families.
   */
  revokeByGrant(grantId: string, now: Date, reason: string): Promise<number>;

  /**
   * Method deleteExpiredFamilies
   * @method deleteExpiredFamilies
   *
   * @description
   * Deletes the families whose most recent token expired by `now`.
   *
   * @param {Date} now - Expiry cutoff.
   *
   * @returns {Promise<number>} Deleted families.
   */
  deleteExpiredFamilies(now: Date): Promise<number>;
  // #endregion
}

/**
 * Interface OAuthRepositories
 * @interface OAuthRepositories
 *
 * @description
 * Transaction-scoped repositories of the authorization server.
 */
export interface OAuthRepositories {
  // #region Properties
  /** Clients. */
  readonly clients: OAuthClientRepository;
  /** Consents. */
  readonly grants: OAuthGrantRepository;
  /** Pending authorization requests. */
  readonly requests: AuthorizationRequestRepository;
  /** Authorization codes. */
  readonly codes: AuthorizationCodeRepository;
  /** Refresh tokens and families. */
  readonly tokens: OAuthTokenRepository;
  // #endregion
}

/**
 * Interface OAuthUnitOfWork
 * @interface OAuthUnitOfWork
 *
 * @description
 * Runs authorization-server repository work in one transaction; a rejection rolls it back.
 */
export interface OAuthUnitOfWork {
  // #region Methods
  /**
   * Method run
   * @method run
   *
   * @description
   * Executes work with transaction-bound repositories.
   *
   * @template T - Value returned by the work.
   * @param {(repositories: OAuthRepositories) => Promise<T>} work - Operations to run atomically.
   *
   * @returns {Promise<T>} Work result once committed.
   */
  run<T>(work: (repositories: OAuthRepositories) => Promise<T>): Promise<T>;
  // #endregion
}

/**
 * Interface FetchedClientMetadata
 * @interface FetchedClientMetadata
 *
 * @description
 * Client ID Metadata Document as fetched, with the freshness its HTTP cache headers allow.
 */
export interface FetchedClientMetadata {
  // #region Properties
  /** Parsed JSON body, validated by the domain. */
  readonly document: unknown;
  /** Seconds the copy may be reused (`max-age`), `0` for `no-store` or `no-cache`, `null` without header. */
  readonly maxAgeSeconds: number | null;
  // #endregion
}

/**
 * Interface ClientMetadataFetcher
 * @interface ClientMetadataFetcher
 *
 * @description
 * Outbound fetches of client metadata documents and logos. Implementations must resist server-side
 * request forgery: `https` only, public addresses only (checked on the resolved address), no
 * redirects, bounded size and time.
 */
export interface ClientMetadataFetcher {
  // #region Methods
  /**
   * Method fetchDocument
   * @method fetchDocument
   *
   * @description
   * Fetches and parses a metadata document.
   *
   * @param {string} url - Client identifier URL.
   *
   * @returns {Promise<FetchedClientMetadata>} Parsed document; rejects on any refusal or failure.
   */
  fetchDocument(url: string): Promise<FetchedClientMetadata>;

  /**
   * Method fetchLogo
   * @method fetchLogo
   *
   * @description
   * Fetches a raster logo and returns it as a `data:` URL; never rejects.
   *
   * @param {string} url - `logo_uri`.
   *
   * @returns {Promise<string | null>} Logo, or `null` on any refusal or failure.
   */
  fetchLogo(url: string): Promise<string | null>;
  // #endregion
}

/**
 * Interface ResourceTokenClaims
 * @interface ResourceTokenClaims
 *
 * @description
 * What an MCP access token states.
 */
export interface ResourceTokenClaims {
  // #region Properties
  /** Administrator (`sub`). */
  readonly accountId: string;
  /** Client (`client_id`). */
  readonly clientId: string;
  /** Granted scopes (`scope`). */
  readonly scopes: readonly OAuthScope[];
  /** Resource (`aud`). */
  readonly resource: string;
  // #endregion
}

/**
 * Interface ResourceTokenSigner
 * @interface ResourceTokenSigner
 *
 * @description
 * Signs the short-lived access tokens of the MCP resource.
 */
export interface ResourceTokenSigner {
  // #region Methods
  /**
   * Method sign
   * @method sign
   *
   * @description
   * Signs an access token audience-bound to the resource.
   *
   * @param {ResourceTokenClaims} claims - Token statements.
   * @param {Date} now - Issuance instant.
   *
   * @returns {Promise<AccessToken>} Signed token and lifetime.
   */
  sign(claims: ResourceTokenClaims, now: Date): Promise<AccessToken>;
  // #endregion
}

/**
 * Interface PkceVerifier
 * @interface PkceVerifier
 *
 * @description
 * Checks a PKCE `code_verifier` against the `S256` challenge of the authorization request.
 */
export interface PkceVerifier {
  // #region Methods
  /**
   * Method matches
   * @method matches
   *
   * @description
   * Compares `BASE64URL(SHA256(verifier))` with the challenge in constant time.
   *
   * @param {string} verifier - Presented verifier.
   * @param {string} challenge - Stored challenge.
   *
   * @returns {boolean} Whether they match.
   */
  matches(verifier: string, challenge: string): boolean;
  // #endregion
}

/**
 * Interface OAuthServerSettings
 * @interface OAuthServerSettings
 *
 * @description
 * Identity of the authorization server and of the one resource it issues tokens for.
 */
export interface OAuthServerSettings {
  // #region Properties
  /** Issuer identifier, returned as `iss` in every authorization response (RFC 9207). */
  readonly issuer: string;
  /** Canonical URI of the MCP resource (RFC 8707). */
  readonly resource: string;
  // #endregion
}
