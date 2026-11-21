import {
  loadContentFixtures,
  migrateContent,
  seedContentDatabase,
} from '@vfortin/content-composition';
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
 * @param {string | undefined} command - Requested operation: `migrate`, `seed` or `fixtures`.
 * @returns {Promise<void>} Completion after the requested database operation finishes.
 *
 * @example
 * `node cli.js migrate` applies the migrations outside service startup.
 * `node cli.js seed` loads the mockup content into the database.
 * `FIXTURES_ALLOWED=true node cli.js fixtures` loads the development fixtures (D55).
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
    case 'fixtures': {
      // Development data only: the production stack never sets this flag (D55).
      if (process.env['FIXTURES_ALLOWED'] !== 'true') {
        throw new Error('Fixtures are development data: set FIXTURES_ALLOWED=true to load them.');
      }
      const summary: Awaited<ReturnType<typeof loadContentFixtures>> = await loadContentFixtures(
        config.CONTENT_DATABASE_URL,
        { siteOrigin: config.SEO_SITE_ORIGIN },
      );
      console.log(
        `Content fixtures loaded: seed content and ${summary.refreshed} SEO reports (${summary.failures.length} failures).`,
      );
      return;
    }
    default:
      throw new Error(`Unknown command "${command ?? ''}": migrate, seed or fixtures.`);
  }
}

run(process.argv[2]).catch((error: unknown): never => {
  console.error(error instanceof Error ? error.message : error);

  // Technical cause (Postgres error, network…): essential to diagnose a migration.
  if (error instanceof Error && error.cause) console.error(error.cause);
  process.exit(1);
});
