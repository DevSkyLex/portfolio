import {
  type ContactDatabaseHandle,
  migrateContactDatabase,
  openContactDatabase,
  SystemClock,
  loadContactFixtures,
} from '@vfortin/contact-adapters-out';

/**
 * Function migrateContact
 *
 * @description
 * Opens the contact database, applies its migrations and closes the handle even when migration fails.
 * @param {string} databaseUrl - Contact database location or connection URL.
 * @param {string} migrationsFolder - Directory containing generated contact migrations.
 * @returns {Promise<void>} Completion after all migrations are applied and the handle is closed.
 */
export async function migrateContact(databaseUrl: string, migrationsFolder: string): Promise<void> {
  const database: ContactDatabaseHandle = await openContactDatabase(databaseUrl);
  try {
    await migrateContactDatabase(database, migrationsFolder);
  } finally {
    await database.close();
  }
}

/**
 * Function loadContactFixtureData
 *
 * @description
 * Loads the contact development fixtures (D55): the fixture inbox, dated from now, without any mail.
 * The database handle is closed even when loading rejects.
 *
 * @param {string} databaseUrl - Connection URL for the contact database.
 * @returns {Promise<number>} Number of fixture messages.
 */
export async function loadContactFixtureData(databaseUrl: string): Promise<number> {
  const database: ContactDatabaseHandle = await openContactDatabase(databaseUrl);
  try {
    return await loadContactFixtures(database.db, new SystemClock().now());
  } finally {
    await database.close();
  }
}
