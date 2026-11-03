import {
  type Database,
  type DatabaseHandle,
  migrateDatabase,
  openDatabase,
} from '@vfortin/backend-persistence';
import { contentTables } from '@internal/content-adapters-out/lib/persistence/schema/content.schema';

/**
 * Type ContentDatabase
 * @type ContentDatabase
 *
 * @description
 * Typed Drizzle database exposing the content bounded context's tables.
 */
export type ContentDatabase = Database<typeof contentTables>;

/**
 * Type ContentTransaction
 *
 * @description
 * Transaction handle preserving the content table registry and the selected database driver.
 */
export type ContentTransaction = Parameters<Parameters<ContentDatabase['transaction']>[0]>[0];

/**
 * Type ContentDatabaseHandle
 * @type ContentDatabaseHandle
 *
 * @description
 * Open database handle returned by the shared persistence adapter for content tables.
 */
export type ContentDatabaseHandle = DatabaseHandle<typeof contentTables>;

/**
 * Function openContentDatabase
 *
 * @description
 * Opens a database handle configured with the content table registry.
 *
 * @param {string} url - Database connection URL accepted by the shared persistence adapter.
 * @returns {Promise<ContentDatabaseHandle>} Open typed database handle.
 */
export function openContentDatabase(url: string): Promise<ContentDatabaseHandle> {
  return openDatabase(url, contentTables);
}

/**
 * Function migrateContentDatabase
 *
 * @description
 * Applies the shared migration set within the content PostgreSQL schema.
 *
 * @param {ContentDatabaseHandle} handle - Open content database handle.
 * @param {string} migrationsFolder - Filesystem directory containing migration files.
 * @returns {Promise<void>} Completion after migrations finish.
 */
export function migrateContentDatabase(
  handle: ContentDatabaseHandle,
  migrationsFolder: string,
): Promise<void> {
  return migrateDatabase(handle, migrationsFolder, 'content');
}
