import {
  type Database,
  type DatabaseHandle,
  migrateDatabase,
  openDatabase,
} from '@vfortin/backend-persistence';
import { identityTables } from '@internal/identity-adapters-out/lib/persistence/schema/identity.schema';

/**
 * Type IdentityDatabase
 * @type IdentityDatabase
 *
 * @description
 * Drizzle database type bound to the identity service's table definitions.
 */
export type IdentityDatabase = Database<typeof identityTables>;

/**
 * Type IdentityDatabaseHandle
 * @type IdentityDatabaseHandle
 *
 * @description
 * Open database handle type bound to the identity tables and used by composition providers.
 */
export type IdentityDatabaseHandle = DatabaseHandle<typeof identityTables>;

/**
 * Function openIdentityDatabase
 *
 * @description
 * Opens the identity database using the shared adapter and its declared tables; accepted URL forms follow the shared persistence adapter contract.
 *
 * @param {string} url - Database connection URL.
 *
 * @returns {Promise<IdentityDatabaseHandle>} Open handle for identity queries and migrations.
 */
export function openIdentityDatabase(url: string): Promise<IdentityDatabaseHandle> {
  return openDatabase(url, identityTables);
}

/**
 * Function migrateIdentityDatabase
 *
 * @description
 * Applies migration files using the identity schema name and the shared persistence adapter.
 *
 * @param {IdentityDatabaseHandle} handle - Open database handle used to run migrations.
 * @param {string} migrationsFolder - Directory containing migration files.
 *
 * @returns {Promise<void>} Completion after the migration runner finishes.
 */
export function migrateIdentityDatabase(
  handle: IdentityDatabaseHandle,
  migrationsFolder: string,
): Promise<void> {
  return migrateDatabase(handle, migrationsFolder, 'identity');
}
