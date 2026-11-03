import {
  type ContentDatabaseHandle,
  migrateContentDatabase,
  openContentDatabase,
  seedContent,
} from '@vfortin/content-adapters-out';

/**
 * Function migrateContent
 *
 * @description
 * Opens the content database, applies migrations explicitly and closes the handle even if migration
 * fails; this is a task entry point rather than startup behavior.
 *
 * @param {string} databaseUrl - Connection URL for the content database.
 * @param {string} migrationsFolder - Directory containing migration files.
 * @returns {Promise<void>} Completion after migrations and connection cleanup.
 */
export async function migrateContent(databaseUrl: string, migrationsFolder: string): Promise<void> {
  const database: ContentDatabaseHandle = await openContentDatabase(databaseUrl);
  try {
    await migrateContentDatabase(database, migrationsFolder);
  } finally {
    await database.close();
  }
}

/**
 * Function seedContentDatabase
 *
 * @description
 * Opens the content database, replaces its current content with the initial seed and closes the
 * handle even when seeding fails.
 *
 * @param {string} databaseUrl - Connection URL for the content database.
 * @returns {Promise<void>} Completion after seeding and connection cleanup.
 */
export async function seedContentDatabase(databaseUrl: string): Promise<void> {
  const database: ContentDatabaseHandle = await openContentDatabase(databaseUrl);
  try {
    await seedContent(database.db);
  } finally {
    await database.close();
  }
}
