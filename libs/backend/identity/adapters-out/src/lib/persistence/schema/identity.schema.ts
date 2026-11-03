import {
  type PgSchema,
  type PgTimestampBuilderInitial,
  boolean,
  index,
  integer,
  pgSchema,
  text,
  timestamp,
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
  totpSecret: text('totp_secret').notNull(),
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
} as const;
