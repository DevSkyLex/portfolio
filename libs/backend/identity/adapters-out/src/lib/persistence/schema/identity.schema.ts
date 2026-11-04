import { sql } from 'drizzle-orm';
import {
  type PgSchema,
  type PgTimestampBuilderInitial,
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Constant identitySchema
 *
 * @description
 * PostgreSQL schema owned by identity persistence and isolated from other service repositories.
 *
 * @type {ReturnType<typeof pgSchema>}
 */
export const identitySchema: PgSchema<'identity'> = pgSchema('identity');

/**
 * Function at
 *
 * @description
 * Creates a timezone-aware PostgreSQL timestamp column represented as a JavaScript `Date`.
 *
 * @param {string} name - Database column name.
 *
 * @returns {ReturnType<typeof timestamp>} Timestamp column builder for the supplied name.
 */
const at = (name: string): PgTimestampBuilderInitial<string> =>
  timestamp(name, { withTimezone: true, mode: 'date' });

/**
 * Constant adminAccounts
 *
 * @description
 * Table definition for the single administrator's credentials and login lockout state.
 */
export const adminAccounts = identitySchema.table('admin_accounts', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  /** Active one-time-code secret; `null` while the second factor is off (D17). */
  totpSecret: text('totp_secret'),
  /** Secret of an enrollment started and not confirmed yet. */
  pendingTotpSecret: text('pending_totp_secret'),
  lastTotpStep: integer('last_totp_step').notNull().default(0),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: at('locked_until'),
});

/**
 * Constant refreshTokenFamilies
 *
 * @description
 * Table definition for one row per login session; locking this row serializes token rotation and revocation applies to later descendants.
 */
export const refreshTokenFamilies = identitySchema.table(
  'refresh_token_families',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => adminAccounts.id, { onDelete: 'cascade' }),
    createdAt: at('created_at').notNull(),
    /** "Remember me": 30-day sliding tokens and a persistent cookie, otherwise 12 hours and a session cookie. */
    persistent: boolean('persistent').notNull().default(false),
    revokedAt: at('revoked_at'),
  },
  (table) => [index('refresh_token_families_account_idx').on(table.accountId)],
);

/**
 * Constant refreshTokens
 *
 * @description
 * Table definition for hashed refresh credentials, including their expiry, rotation and revocation timestamps.
 */
export const refreshTokens = identitySchema.table(
  'refresh_tokens',
  {
    id: text('id').primaryKey(),
    familyId: text('family_id')
      .notNull()
      .references(() => refreshTokenFamilies.id, { onDelete: 'cascade' }),
    accountId: text('account_id')
      .notNull()
      .references(() => adminAccounts.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: at('expires_at').notNull(),
    rotatedAt: at('rotated_at'),
    revokedAt: at('revoked_at'),
  },
  (table) => [
    index('refresh_tokens_family_idx').on(table.familyId),
    index('refresh_tokens_account_idx').on(table.accountId),
  ],
);

/**
 * Constant loginChallenges
 *
 * @description
 * Table definition for the second-step challenges opened by a correct password; locking a row serializes
 * the submissions of one challenge.
 */
export const loginChallenges = identitySchema.table(
  'login_challenges',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => adminAccounts.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    remember: boolean('remember').notNull(),
    expiresAt: at('expires_at').notNull(),
    attempts: integer('attempts').notNull().default(0),
    consumedAt: at('consumed_at'),
  },
  (table) => [index('login_challenges_account_idx').on(table.accountId)],
);

/**
 * Constant trustedDevices
 *
 * @description
 * Table definition for the browsers allowed to skip the one-time code, identified by the hash of their
 * cookie token.
 */
export const trustedDevices = identitySchema.table(
  'trusted_devices',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => adminAccounts.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: at('created_at').notNull(),
    expiresAt: at('expires_at').notNull(),
    lastUsedAt: at('last_used_at'),
    revokedAt: at('revoked_at'),
  },
  (table) => [index('trusted_devices_account_idx').on(table.accountId)],
);

/**
 * Constant oauthClients
 *
 * @description
 * Clients of the OAuth authorization server (D45): dynamic registrations, and the cached copies of
 * fetched Client ID Metadata Documents (refetched once `metadata_expires_at` passes). The logo is
 * stored as the `data:` URL the server fetched.
 */
export const oauthClients = identitySchema.table(
  'oauth_clients',
  {
    /** `client_id`: the document URL, or a generated identifier for a dynamic registration. */
    id: text('id').primaryKey(),
    kind: text('kind').$type<'metadata-document' | 'dynamic'>().notNull(),
    name: text('name'),
    clientUri: text('client_uri'),
    logoUri: text('logo_uri'),
    logo: text('logo'),
    logoFetchedAt: at('logo_fetched_at'),
    redirectUris: jsonb('redirect_uris').$type<string[]>().notNull(),
    createdAt: at('created_at').notNull(),
    updatedAt: at('updated_at').notNull(),
    metadataExpiresAt: at('metadata_expires_at'),
  },
  (table) => [index('oauth_clients_kind_created_idx').on(table.kind, table.createdAt)],
);

/**
 * Constant oauthGrants
 *
 * @description
 * The administrator's consents to clients, kept after revocation for the audit; at most one active
 * grant per account and client.
 */
export const oauthGrants = identitySchema.table(
  'oauth_grants',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => adminAccounts.id, { onDelete: 'cascade' }),
    clientId: text('client_id')
      .notNull()
      .references(() => oauthClients.id, { onDelete: 'cascade' }),
    scopes: jsonb('scopes').$type<string[]>().notNull(),
    createdAt: at('created_at').notNull(),
    updatedAt: at('updated_at').notNull(),
    revokedAt: at('revoked_at'),
  },
  (table) => [
    index('oauth_grants_account_idx').on(table.accountId),
    uniqueIndex('oauth_grants_active_idx')
      .on(table.accountId, table.clientId)
      .where(sql`${table.revokedAt} is null`),
  ],
);

/**
 * Constant oauthAuthorizationRequests
 *
 * @description
 * Validated authorization requests waiting for the owner's decision (ten minutes), bound to the
 * administrator session that reviewed them.
 */
export const oauthAuthorizationRequests = identitySchema.table(
  'oauth_authorization_requests',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => adminAccounts.id, { onDelete: 'cascade' }),
    /** Administrator session (`sid`, a refresh-token family) that reviewed the request. */
    sessionId: text('session_id').notNull(),
    clientId: text('client_id')
      .notNull()
      .references(() => oauthClients.id, { onDelete: 'cascade' }),
    redirectUri: text('redirect_uri').notNull(),
    scopes: jsonb('scopes').$type<string[]>().notNull(),
    resource: text('resource').notNull(),
    state: text('state'),
    codeChallenge: text('code_challenge').notNull(),
    createdAt: at('created_at').notNull(),
    expiresAt: at('expires_at').notNull(),
    decidedAt: at('decided_at'),
  },
  (table) => [index('oauth_authorization_requests_expires_idx').on(table.expiresAt)],
);

/**
 * Constant oauthAuthorizationCodes
 *
 * @description
 * Single-use authorization codes (sixty seconds), stored hashed with the parameters the token request
 * must match; kept a day after expiry so a replay still revokes the family it opened.
 */
export const oauthAuthorizationCodes = identitySchema.table(
  'oauth_authorization_codes',
  {
    id: text('id').primaryKey(),
    codeHash: text('code_hash').notNull().unique(),
    accountId: text('account_id')
      .notNull()
      .references(() => adminAccounts.id, { onDelete: 'cascade' }),
    clientId: text('client_id')
      .notNull()
      .references(() => oauthClients.id, { onDelete: 'cascade' }),
    grantId: text('grant_id')
      .notNull()
      .references(() => oauthGrants.id, { onDelete: 'cascade' }),
    redirectUri: text('redirect_uri').notNull(),
    scopes: jsonb('scopes').$type<string[]>().notNull(),
    resource: text('resource').notNull(),
    codeChallenge: text('code_challenge').notNull(),
    createdAt: at('created_at').notNull(),
    expiresAt: at('expires_at').notNull(),
    consumedAt: at('consumed_at'),
    /** Family opened by the redemption; no foreign key, the family may be purged first. */
    familyId: text('family_id'),
  },
  (table) => [index('oauth_authorization_codes_expires_idx').on(table.expiresAt)],
);

/**
 * Constant oauthTokenFamilies
 *
 * @description
 * One row per code redemption, the MCP counterpart of `refresh_token_families` (D27): locking it
 * serializes rotation and revocation; `revoked_reason` is `replay`, `client` (RFC 7009) or `owner`.
 */
export const oauthTokenFamilies = identitySchema.table(
  'oauth_token_families',
  {
    id: text('id').primaryKey(),
    grantId: text('grant_id')
      .notNull()
      .references(() => oauthGrants.id, { onDelete: 'cascade' }),
    accountId: text('account_id')
      .notNull()
      .references(() => adminAccounts.id, { onDelete: 'cascade' }),
    clientId: text('client_id')
      .notNull()
      .references(() => oauthClients.id, { onDelete: 'cascade' }),
    resource: text('resource').notNull(),
    scopes: jsonb('scopes').$type<string[]>().notNull(),
    createdAt: at('created_at').notNull(),
    lastUsedAt: at('last_used_at').notNull(),
    revokedAt: at('revoked_at'),
    revokedReason: text('revoked_reason'),
  },
  (table) => [index('oauth_token_families_grant_idx').on(table.grantId)],
);

/**
 * Constant oauthRefreshTokens
 *
 * @description
 * Hashed, rotating MCP refresh tokens; separate from the administrator's, so neither can be
 * exchanged at the other's endpoint.
 */
export const oauthRefreshTokens = identitySchema.table(
  'oauth_refresh_tokens',
  {
    id: text('id').primaryKey(),
    familyId: text('family_id')
      .notNull()
      .references(() => oauthTokenFamilies.id, { onDelete: 'cascade' }),
    accountId: text('account_id')
      .notNull()
      .references(() => adminAccounts.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: at('created_at').notNull().defaultNow(),
    expiresAt: at('expires_at').notNull(),
    rotatedAt: at('rotated_at'),
    revokedAt: at('revoked_at'),
  },
  (table) => [index('oauth_refresh_tokens_family_idx').on(table.familyId)],
);

/**
 * Constant identityTables
 *
 * @description
 * Schema tables passed to the shared persistence adapter for database and migration setup.
 */
export const identityTables = {
  adminAccounts,
  refreshTokenFamilies,
  refreshTokens,
  loginChallenges,
  trustedDevices,
  oauthClients,
  oauthGrants,
  oauthAuthorizationRequests,
  oauthAuthorizationCodes,
  oauthTokenFamilies,
  oauthRefreshTokens,
} as const;
