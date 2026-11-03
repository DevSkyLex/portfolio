import { migrateContent, seedContentDatabase } from '@vfortin/content-composition';
import { join } from 'node:path';
import {
  type ContentServiceConfig,
  loadContentServiceConfig,
} from '@internal/content-service/config';

/**
 * Function run
 *
 * @description
 * Runs an explicit content database migration or seed operation outside HTTP service startup.
 * Unknown or missing commands reject with an error for the CLI failure handler.
 *
 * @param {string | undefined} command - Requested operation: `migrate` or `seed`.
 * @returns {Promise<void>} Completion after the requested database operation finishes.
 *
 * @example
 * `node cli.js migrate` applies the migrations outside service startup.
 * `node cli.js seed` loads the mockup content into the database.
 */
async function run(command: string | undefined): Promise<void> {
  const config: ContentServiceConfig = loadContentServiceConfig();
  switch (command) {
    case 'migrate':
      await migrateContent(
        config.CONTENT_DATABASE_URL,
        config.CONTENT_MIGRATIONS_DIR ?? join(__dirname, 'migrations'),
      );
      console.log('Content service migrations applied.');
      return;
    case 'seed':
      await seedContentDatabase(config.CONTENT_DATABASE_URL);
      console.log('Mockup content loaded.');
      return;
    default:
      throw new Error(`Unknown command "${command ?? ''}": migrate or seed.`);
  }
}

run(process.argv[2]).catch((error: unknown): never => {
  console.error(error instanceof Error ? error.message : error);

  // Technical cause (Postgres error, network…): essential to diagnose a migration.
  if (error instanceof Error && error.cause) console.error(error.cause);
  process.exit(1);
});
