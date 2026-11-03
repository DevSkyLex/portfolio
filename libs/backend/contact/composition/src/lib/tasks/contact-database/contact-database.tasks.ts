import {
  type ContactDatabaseHandle,
  migrateContactDatabase,
  openContactDatabase,
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
