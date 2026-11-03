import {
  type Database,
  type DatabaseHandle,
  migrateDatabase,
  openDatabase,
} from '@vfortin/backend-persistence';
import { contactTables } from '@internal/contact-adapters-out/lib/persistence/schema/contact.schema';

/**
 * Type ContactDatabase
 * @type ContactDatabase
 *
 * @description
 * Drizzle database type bound to the contact service tables.
 */
export type ContactDatabase = Database<typeof contactTables>;

/**
 * Type ContactDatabaseHandle
 * @type ContactDatabaseHandle
 *
 * @description
 * Managed database handle type bound to the contact service tables.
 */
export type ContactDatabaseHandle = DatabaseHandle<typeof contactTables>;

/**
 * Function openContactDatabase
 *
 * @description
 * Opens the contact database through the shared persistence adapter using the supported URL forms.
 * @param {string} url - Database connection URL or development database location.
 * @returns {Promise<ContactDatabaseHandle>} Open handle bound to contact tables.
 */
export function openContactDatabase(url: string): Promise<ContactDatabaseHandle> {
  return openDatabase(url, contactTables);
}

/**
 * Function migrateContactDatabase
 *
 * @description
 * Applies the configured migration set to the contact schema through the shared persistence adapter.
 * @param {ContactDatabaseHandle} handle - Open contact database handle.
 * @param {string} migrationsFolder - Directory containing contact migration files.
 * @returns {Promise<void>} Completion after all migrations have been applied.
 */
export function migrateContactDatabase(
  handle: ContactDatabaseHandle,
  migrationsFolder: string,
): Promise<void> {
  return migrateDatabase(handle, migrationsFolder, 'contact');
}
