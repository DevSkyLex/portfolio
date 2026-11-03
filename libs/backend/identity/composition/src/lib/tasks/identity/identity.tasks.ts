import {
  RandomIdGenerator,
  RfcTotpVerifier,
  ScryptPasswordHasher,
  generateSigningKey,
  migrateIdentityDatabase,
  openIdentityDatabase,
  DrizzleAdminAccountRepository,
  type IdentityDatabaseHandle,
} from '@vfortin/identity-adapters-out';
import { BootstrapAdmin, type BootstrapResult } from '@vfortin/identity-application';

/**
 * Function migrateIdentity
 *
 * @description
 * Applies identity database migrations as an explicit operations command rather than during application startup. The opened database handle is closed whether migration succeeds or rejects.
 *
 * @param {string} databaseUrl - Connection URL for the identity database.
 * @param {string} migrationsFolder - Directory containing migration files.
 *
 * @returns {Promise<void>} Completion after migrations have been applied and the handle closed.
 */
export async function migrateIdentity(
  databaseUrl: string,
  migrationsFolder: string,
): Promise<void> {
  const database: IdentityDatabaseHandle = await openIdentityDatabase(databaseUrl);
  try {
    await migrateIdentityDatabase(database, migrationsFolder);
  } finally {
    await database.close();
  }
}

/**
 * Function bootstrapAdmin
 *
 * @description
 * Creates the initial administrator through the application use case and returns the generated TOTP secret for authenticator enrollment. The database handle is closed even when setup rejects.
 *
 * @param {string} databaseUrl - Connection URL for the identity database.
 * @param {string} email - Initial administrator address.
 * @param {string} password - Initial plain password validated and hashed by the use case.
 *
 * @returns {Promise<BootstrapResult>} Normalized email, enrollment secret and provisioning URI.
 */
export async function bootstrapAdmin(
  databaseUrl: string,
  email: string,
  password: string,
): Promise<BootstrapResult> {
  const database: IdentityDatabaseHandle = await openIdentityDatabase(databaseUrl);
  try {
    return await new BootstrapAdmin(
      new DrizzleAdminAccountRepository(database.db),
      new ScryptPasswordHasher(),
      new RfcTotpVerifier(),
      new RandomIdGenerator(),
    ).execute(email, password);
  } finally {
    await database.close();
  }
}

/**
 * Function generateSigningKey
 *
 * @description
 * Re-exports the signing-key generator used by identity operations tooling.
 */
export { generateSigningKey };
