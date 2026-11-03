import type {
  AdminAccount,
  LoginChallenge,
  RefreshToken,
  SessionFamily,
  TrustedDevice,
} from '@vfortin/identity-domain';

/**
 * Interface AdminAccountRepository
 * @interface AdminAccountRepository
 *
 * @description
 * Persistence operations for administrator credential state; lock semantics keep concurrent authentication decisions serializable.
 */
export interface AdminAccountRepository {
  // #region Methods
  /**
   * Method count
   * @method count
   *
   * @description
   * Counts stored administrator accounts to enforce one-time bootstrap.
   *
   * @returns {Promise<number>} Number of accounts currently stored.
   */
  count(): Promise<number>;

  /**
   * Method findById
   * @method findById
   *
   * @description
   * Loads an account by its stable identifier without acquiring an authentication lock.
   *
   * @param {string} id - Account identifier.
   *
   * @returns {Promise<AdminAccount | null>} Account when present, otherwise `null`.
   */
  findById(id: string): Promise<AdminAccount | null>;

  /**
   * Method lockByEmail
   * @method lockByEmail
   *
   * @description
   * Reads and locks the account until its transaction completes so concurrent logins serialize TOTP replay checks and failed-attempt updates.
   *
   * @param {string} email - Normalized address used to locate the account.
   *
   * @returns {Promise<AdminAccount | null>} Locked account when present, otherwise `null`.
   */
  lockByEmail(email: string): Promise<AdminAccount | null>;

  /**
   * Method lockById
   * @method lockById
   *
   * @description
   * Reads and locks the account like `lockByEmail`, for the second login step that only knows the
   * account from its challenge.
   *
   * @param {string} id - Account identifier.
   *
   * @returns {Promise<AdminAccount | null>} Locked account when present, otherwise `null`.
   */
  lockById(id: string): Promise<AdminAccount | null>;

  /**
   * Method add
   * @method add
   *
   * @description
   * Persists a newly created administrator account during bootstrap.
   *
   * @param {AdminAccount} account - New account state to store.
   *
   * @returns {Promise<void>} Completion after persistence.
   */
  add(account: AdminAccount): Promise<void>;

  /**
   * Method save
   * @method save
   *
   * @description
   * Persists updated lockout or accepted-TOTP state for an existing account.
   *
   * @param {AdminAccount} account - Updated account state.
   *
   * @returns {Promise<void>} Completion after persistence.
   */
  save(account: AdminAccount): Promise<void>;
  // #endregion
}

/**
 * Interface RefreshTokenRepository
 * @interface RefreshTokenRepository
 *
 * @description
 * Persistence operations for refresh tokens and their revocation families, with locking around rotation and replay handling.
 */
export interface RefreshTokenRepository {
  // #region Methods
  /**
   * Method addFamily
   * @method addFamily
   *
   * @description
   * Opens the family that groups all refresh tokens issued for one login session, with its creation
   * time and "remember me" flag kept for every later rotation.
   *
   * @param {SessionFamily} family - New session family.
   *
   * @returns {Promise<void>} Completion after family persistence.
   */
  addFamily(family: SessionFamily): Promise<void>;

  /**
   * Method lockFamily
   * @method lockFamily
   *
   * @description
   * Locks the family through transaction completion so rotation, replay detection and logout cannot issue a descendant after revocation.
   *
   * @param {string} familyId - Session family to serialize.
   *
   * @returns {Promise<SessionFamily | null>} Locked family, or `null` when it no longer exists.
   */
  lockFamily(familyId: string): Promise<SessionFamily | null>;

  /**
   * Method add
   * @method add
   *
   * @description
   * Persists an issued refresh token in its existing family.
   *
   * @param {RefreshToken} token - Token state containing only the stored hash, not the bearer value.
   *
   * @returns {Promise<void>} Completion after token persistence.
   */
  add(token: RefreshToken): Promise<void>;

  /**
   * Method findByHash
   * @method findByHash
   *
   * @description
   * Loads token state by its stored hash, incorporating family revocation into the returned state.
   *
   * @param {string} tokenHash - Hash of the presented opaque token.
   *
   * @returns {Promise<RefreshToken | null>} Token state when present, otherwise `null`.
   */
  findByHash(tokenHash: string): Promise<RefreshToken | null>;

  /**
   * Method markRotated
   * @method markRotated
   *
   * @description
   * Atomically marks a token as replaced only while it remains unspent, supporting concurrent replay detection.
   *
   * @param {string} tokenHash - Hash identifying the token to rotate.
   * @param {Date} now - Rotation timestamp.
   *
   * @returns {Promise<boolean>} `true` when marked, or `false` when already spent.
   */
  markRotated(tokenHash: string, now: Date): Promise<boolean>;

  /**
   * Method revokeFamily
   * @method revokeFamily
   *
   * @description
   * Revokes the family so all of its tokens, including later descendants, are refused.
   *
   * @param {string} familyId - Session family to revoke.
   * @param {Date} now - Revocation timestamp.
   *
   * @returns {Promise<void>} Completion after family revocation.
   */
  revokeFamily(familyId: string, now: Date): Promise<void>;

  /**
   * Method deleteExpiredFamilies
   * @method deleteExpiredFamilies
   *
   * @description
   * Removes families after every token in them has expired.
   *
   * @param {Date} now - Time used to evaluate token expiry.
   *
   * @returns {Promise<number>} Number of families deleted.
   */
  deleteExpiredFamilies(now: Date): Promise<number>;
  // #endregion
}

/**
 * Interface LoginChallengeRepository
 * @interface LoginChallengeRepository
 *
 * @description
 * Persistence operations for the second-step challenges opened by a correct password.
 */
export interface LoginChallengeRepository {
  // #region Methods
  /**
   * Method add
   * @method add
   *
   * @description
   * Persists a newly opened challenge.
   *
   * @param {LoginChallenge} challenge - Challenge state containing only the stored hash.
   *
   * @returns {Promise<void>} Completion after persistence.
   */
  add(challenge: LoginChallenge): Promise<void>;

  /**
   * Method lockByHash
   * @method lockByHash
   *
   * @description
   * Reads and locks the challenge until its transaction completes, so two submissions of the same
   * challenge are checked one after the other and the second sees the first's outcome.
   *
   * @param {string} tokenHash - Hash of the presented challenge.
   *
   * @returns {Promise<LoginChallenge | null>} Locked challenge when present, otherwise `null`.
   */
  lockByHash(tokenHash: string): Promise<LoginChallenge | null>;

  /**
   * Method save
   * @method save
   *
   * @description
   * Persists the attempt counter of an existing challenge.
   *
   * @param {LoginChallenge} challenge - Updated challenge state.
   *
   * @returns {Promise<void>} Completion after persistence.
   */
  save(challenge: LoginChallenge): Promise<void>;

  /**
   * Method consume
   * @method consume
   *
   * @description
   * Atomically marks the challenge as used only while it is still unused, so it opens one session at most.
   *
   * @param {string} id - Challenge identifier.
   * @param {Date} now - Consumption timestamp.
   *
   * @returns {Promise<boolean>} `true` when marked, or `false` when already used.
   */
  consume(id: string, now: Date): Promise<boolean>;

  /**
   * Method deleteExpired
   * @method deleteExpired
   *
   * @description
   * Removes the challenges whose expiry is at or before `now`.
   *
   * @param {Date} now - Expiry cutoff.
   *
   * @returns {Promise<number>} Number of challenges deleted.
   */
  deleteExpired(now: Date): Promise<number>;
  // #endregion
}

/**
 * Interface TrustedDeviceRepository
 * @interface TrustedDeviceRepository
 *
 * @description
 * Persistence operations for the browsers allowed to skip the one-time code.
 */
export interface TrustedDeviceRepository {
  // #region Methods
  /**
   * Method add
   * @method add
   *
   * @description
   * Persists a newly trusted device.
   *
   * @param {TrustedDevice} device - Device state containing only the stored hash.
   *
   * @returns {Promise<void>} Completion after persistence.
   */
  add(device: TrustedDevice): Promise<void>;

  /**
   * Method findByHash
   * @method findByHash
   *
   * @description
   * Loads a device by the hash of its cookie token, whatever its account, expiry or revocation.
   *
   * @param {string} tokenHash - Hash of the presented device token.
   *
   * @returns {Promise<TrustedDevice | null>} Device when present, otherwise `null`.
   */
  findByHash(tokenHash: string): Promise<TrustedDevice | null>;

  /**
   * Method save
   * @method save
   *
   * @description
   * Persists the last use of an existing device.
   *
   * @param {TrustedDevice} device - Updated device state.
   *
   * @returns {Promise<void>} Completion after persistence.
   */
  save(device: TrustedDevice): Promise<void>;

  /**
   * Method deleteExpired
   * @method deleteExpired
   *
   * @description
   * Removes the devices whose expiry is at or before `now`.
   *
   * @param {Date} now - Expiry cutoff.
   *
   * @returns {Promise<number>} Number of devices deleted.
   */
  deleteExpired(now: Date): Promise<number>;
  // #endregion
}

/**
 * Interface IdentityRepositories
 * @interface IdentityRepositories
 *
 * @description
 * Transaction-scoped repository collection passed to identity use cases.
 */
export interface IdentityRepositories {
  // #region Properties
  /**
   * Property accounts
   * @readonly
   *
   * @description
   * Account repository participating in the current unit-of-work transaction.
   *
   * @type {AdminAccountRepository}
   */
  readonly accounts: AdminAccountRepository;

  /**
   * Property tokens
   * @readonly
   *
   * @description
   * Refresh-token repository participating in the current unit-of-work transaction.
   *
   * @type {RefreshTokenRepository}
   */
  readonly tokens: RefreshTokenRepository;

  /**
   * Property challenges
   * @readonly
   *
   * @description
   * Login-challenge repository participating in the current unit-of-work transaction.
   *
   * @type {LoginChallengeRepository}
   */
  readonly challenges: LoginChallengeRepository;

  /**
   * Property devices
   * @readonly
   *
   * @description
   * Trusted-device repository participating in the current unit-of-work transaction.
   *
   * @type {TrustedDeviceRepository}
   */
  readonly devices: TrustedDeviceRepository;
  // #endregion
}

/**
 * Interface IdentityUnitOfWork
 * @interface IdentityUnitOfWork
 *
 * @description
 * Runs identity repository operations atomically so returned work is committed together or rolled back on rejection.
 */
export interface IdentityUnitOfWork {
  // #region Methods
  /**
   * Method run
   * @method run
   *
   * @description
   * Executes asynchronous work with transaction-bound repositories; a rejection rolls back the unit of work.
   *
   * @template T - Value returned by the transactional work callback.
   * @param {(repositories: IdentityRepositories) => Promise<T>} work - Operations to execute in one transaction.
   *
   * @returns {Promise<T>} Callback result after successful transaction completion.
   */
  run<T>(work: (repositories: IdentityRepositories) => Promise<T>): Promise<T>;
  // #endregion
}

/**
 * Interface PasswordHasher
 * @interface PasswordHasher
 *
 * @description
 * Port for password hashing and verification without coupling application rules to a crypto library.
 */
export interface PasswordHasher {
  // #region Methods
  /**
   * Method hash
   * @method hash
   *
   * @description
   * Produces a persisted password verifier from a plain password.
   *
   * @param {string} password - Plain password that must not be retained by the application.
   *
   * @returns {Promise<string>} Encoded password hash.
   */
  hash(password: string): Promise<string>;

  /**
   * Method verify
   * @method verify
   *
   * @description
   * Compares a candidate password with an encoded verifier.
   *
   * @param {string} password - Candidate plain password.
   * @param {string} hash - Previously encoded verifier.
   *
   * @returns {Promise<boolean>} Whether the candidate matches the verifier.
   */
  verify(password: string, hash: string): Promise<boolean>;
  // #endregion
}

/**
 * Interface TotpVerifier
 * @interface TotpVerifier
 *
 * @description
 * Port for authenticator secret setup and time-based one-time-password validation.
 */
export interface TotpVerifier {
  // #region Methods
  /**
   * Method generateSecret
   * @method generateSecret
   *
   * @description
   * Creates a new secret for administrator authenticator enrollment.
   *
   * @returns {string} Base32 secret suitable for provisioning.
   */
  generateSecret(): string;

  /**
   * Method provisioningUri
   * @method provisioningUri
   *
   * @description
   * Builds the authenticator enrollment URI from the secret and account label.
   *
   * @param {string} secret - Base32 enrollment secret.
   * @param {string} account - Account label shown by the authenticator.
   *
   * @returns {string} `otpauth://` provisioning URI.
   */
  provisioningUri(secret: string, account: string): string;

  /**
   * Method verify
   * @method verify
   *
   * @description
   * Checks the code in the current or adjacent time steps and returns the matched step for replay prevention.
   *
   * @param {string} secret - Account's base32 TOTP secret.
   * @param {string} code - Candidate one-time password.
   * @param {Date} now - Time used to select the verification window.
   *
   * @returns {number | null} Matched time step, or `null` when no code in the window matches.
   */
  verify(secret: string, code: string, now: Date): number | null;
  // #endregion
}

/**
 * Interface AccessToken
 * @interface AccessToken
 *
 * @description
 * Signed access credential and its validity period returned by the token signer.
 */
export interface AccessToken {
  // #region Properties
  /**
   * Property token
   * @readonly
   *
   * @description
   * Signed token value sent to authenticated API clients.
   *
   * @type {string}
   */
  readonly token: string;

  /**
   * Property expiresIn
   * @readonly
   *
   * @description
   * Token validity period used by clients, in seconds.
   *
   * @type {number}
   */
  readonly expiresIn: number;
  // #endregion
}

/**
 * Interface TokenSigner
 * @interface TokenSigner
 *
 * @description
 * Port for signing a time-bound access JWT for an administrator account.
 */
export interface TokenSigner {
  // #region Methods
  /**
   * Method sign
   * @method sign
   *
   * @description
   * Signs an access token for the account and its session using the supplied issuance time.
   *
   * @param {string} accountId - Account identifier represented by the token (`sub`).
   * @param {string} sessionId - Refresh-token family the token belongs to (`sid`).
   * @param {Date} now - Token issuance time.
   *
   * @returns {Promise<AccessToken>} Signed token and configured validity duration.
   */
  sign(accountId: string, sessionId: string, now: Date): Promise<AccessToken>;
  // #endregion
}

/**
 * Interface RefreshTokenCodec
 * @interface RefreshTokenCodec
 *
 * @description
 * Port for generating opaque bearer credentials and deriving their persisted lookup hashes; it serves
 * the refresh tokens, the login challenges and the trusted-device tokens alike.
 */
export interface RefreshTokenCodec {
  // #region Methods
  /**
   * Method generate
   * @method generate
   *
   * @description
   * Generates a bearer refresh credential that can be returned to the client.
   *
   * @returns {string} Opaque refresh token.
   */
  generate(): string;

  /**
   * Method hash
   * @method hash
   *
   * @description
   * Derives the value used for repository lookup so the bearer token need not be persisted.
   *
   * @param {string} token - Opaque bearer credential.
   *
   * @returns {string} Deterministic stored lookup hash.
   */
  hash(token: string): string;
  // #endregion
}

/**
 * Interface Clock
 * @interface Clock
 *
 * @description
 * Port for supplying the current time to identity rules and persistence operations.
 */
export interface Clock {
  // #region Methods
  /**
   * Method now
   * @method now
   *
   * @description
   * Reads the current time from the configured clock implementation.
   *
   * @returns {Date} Current instant.
   */
  now(): Date;
  // #endregion
}

/**
 * Interface IdGenerator
 * @interface IdGenerator
 *
 * @description
 * Port for generating identifiers used by identity records and session families.
 */
export interface IdGenerator {
  // #region Methods
  /**
   * Method next
   * @method next
   *
   * @description
   * Generates one new identifier for a domain or persistence record.
   *
   * @returns {string} Generated identifier.
   */
  next(): string;
  // #endregion
}
