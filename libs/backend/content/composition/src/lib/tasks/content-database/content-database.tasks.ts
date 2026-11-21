import {
  type ContentDatabaseHandle,
  DrizzleArticleRepository,
  DrizzleSeoReportStore,
  FixtureAnalyticsReader,
  FixtureSearchConsoleReader,
  FixtureWebVitalsReader,
  SystemClock,
  migrateContentDatabase,
  openContentDatabase,
  seedContent,
} from '@vfortin/content-adapters-out';
import {
  RefreshSeoDashboard,
  type SeoRefreshSummary,
  type SeoReportStore,
} from '@vfortin/content-application';

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

/**
 * Interface ContentFixtureOptions
 * @interface ContentFixtureOptions
 *
 * @description
 * Settings of the content fixtures: the origin the SEO reports speak of.
 */
export interface ContentFixtureOptions {
  // #region Properties
  /** Public origin of the site whose pages the fixture reports list (`SEO_SITE_ORIGIN`). */
  readonly siteOrigin: string;
  // #endregion
}

/**
 * Function loadContentFixtures
 *
 * @description
 * Loads the development fixtures of the content service (D55): the seed content (it replaces the
 * current content), then one SEO dashboard refresh whose sources are the fixture generators, so that
 * the reports reach the cache through the production refresh and store. The ten-minute guard between
 * refreshes is lifted for this run only.
 *
 * @param {string} databaseUrl - Connection URL for the content database (migrator role).
 * @param {ContentFixtureOptions} options - Site origin.
 * @returns {Promise<SeoRefreshSummary>} The fixture refresh, with its counts.
 */
export async function loadContentFixtures(
  databaseUrl: string,
  options: ContentFixtureOptions,
): Promise<SeoRefreshSummary> {
  const database: ContentDatabaseHandle = await openContentDatabase(databaseUrl);
  try {
    await seedContent(database.db);
    const store: DrizzleSeoReportStore = new DrizzleSeoReportStore(database.db);
    // Claims even right after another refresh: the fixtures replace whatever the cache holds.
    const fixtureStore: SeoReportStore = {
      load: store.load.bind(store),
      saveReport: store.saveReport.bind(store),
      saveFailure: store.saveFailure.bind(store),
      claimRefresh: (now: Date): Promise<boolean> => store.claimRefresh(now, now),
      finishRefresh: store.finishRefresh.bind(store),
      refreshState: store.refreshState.bind(store),
    };
    const refresh: RefreshSeoDashboard = new RefreshSeoDashboard(
      fixtureStore,
      {
        searchConsole: { reader: new FixtureSearchConsoleReader(options.siteOrigin) },
        analytics: { reader: new FixtureAnalyticsReader() },
        webVitals: { reader: new FixtureWebVitalsReader() },
      },
      new DrizzleArticleRepository(database.db),
      new SystemClock(),
      { siteOrigin: options.siteOrigin, webVitalsUrls: [] },
    );
    return await (
      await refresh.start()
    ).completion;
  } finally {
    await database.close();
  }
}
