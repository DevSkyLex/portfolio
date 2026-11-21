import type { IdentityDatabase } from '@internal/identity-adapters-out/lib/persistence/database/identity-database';
import { adminAccounts } from '@internal/identity-adapters-out/lib/persistence/schema/identity.schema';
import type { PasswordHasher } from '@vfortin/identity-application';

/**
 * Constant IDENTITY_FIXTURE_ADMIN
 *
 * @description
 * Administrator of the development fixtures (D55): a known test account for the local stack, never
 * loaded in production (the CLI requires `FIXTURES_ALLOWED=true`, set by `docker/compose.dev.yml`
 * only). The password is a published test value, not a secret.
 *
 * @type {{ readonly id: string; readonly email: string; readonly password: string }}
 */
export const IDENTITY_FIXTURE_ADMIN: {
  readonly id: string;
  readonly email: string;
  readonly password: string;
} = {
  id: '00000000-0000-4000-8000-00000000a001',
  email: 'admin@localhost.test',
  password: 'orbite-fixtures-admin',
};

/**
 * Function loadIdentityFixtures
 *
 * @description
 * Creates the fixture administrator, or resets it when the e-mail exists: the fixture password, no
 * second factor, no pending enrollment, no failed attempt or lock, so the documented credentials
 * always sign in. Other accounts and sessions are left as they are.
 *
 * @param {IdentityDatabase} db - Identity database.
 * @param {PasswordHasher} hasher - Password hasher of the service (scrypt).
 * @returns {Promise<{ readonly email: string }>} The fixture account.
 */
export async function loadIdentityFixtures(
  db: IdentityDatabase,
  hasher: PasswordHasher,
): Promise<{ readonly email: string }> {
  const passwordHash: string = await hasher.hash(IDENTITY_FIXTURE_ADMIN.password);
  const reset = {
    passwordHash,
    totpSecret: null,
    pendingTotpSecret: null,
    lastTotpStep: 0,
    failedAttempts: 0,
    lockedUntil: null,
  } as const;
  await db
    .insert(adminAccounts)
    .values({ id: IDENTITY_FIXTURE_ADMIN.id, email: IDENTITY_FIXTURE_ADMIN.email, ...reset })
    .onConflictDoUpdate({ target: adminAccounts.email, set: reset });
  return { email: IDENTITY_FIXTURE_ADMIN.email };
}
