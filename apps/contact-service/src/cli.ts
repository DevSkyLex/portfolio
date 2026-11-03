import { migrateContact } from '@vfortin/contact-composition';
import { join } from 'node:path';
import {
  type ContactServiceConfig,
  loadContactServiceConfig,
} from '@internal/contact-service/config';

/**
 * Function run
 *
 * @description
 * Executes the explicit contact database migration command outside normal HTTP service startup.
 * Unknown or missing commands reject with an error for the CLI failure handler.
 *
 * @param {string | undefined} command - Requested operation; only `migrate` is supported.
 * @returns {Promise<void>} Completion after the migration has been applied.
 *
 * @example
 * `node cli.js migrate` applies the migrations outside service startup.
 */
async function run(command: string | undefined): Promise<void> {
  const config: ContactServiceConfig = loadContactServiceConfig();
  switch (command) {
    case 'migrate':
      await migrateContact(
        config.CONTACT_DATABASE_URL,
        config.CONTACT_MIGRATIONS_DIR ?? join(__dirname, 'migrations'),
      );
      console.log('Contact service migrations applied.');
      return;
    default:
      throw new Error(`Unknown command "${command ?? ''}": migrate.`);
  }
}

run(process.argv[2]).catch((error: unknown): never => {
  console.error(error instanceof Error ? error.message : error);

  // Technical cause (Postgres error, network…): essential to diagnose a migration.
  if (error instanceof Error && error.cause) console.error(error.cause);
  process.exit(1);
});
