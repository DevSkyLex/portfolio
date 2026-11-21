import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type ContentDatabaseHandle,
  DrizzleArticleRepository,
  DrizzleSeoReportStore,
  openContentDatabase,
} from '@vfortin/content-adapters-out';
import type { SeoDashboardCache, SeoRefreshSummary } from '@vfortin/content-application';
import {
  loadContentFixtures,
  migrateContent,
} from '@internal/content-composition/lib/tasks/content-database/content-database.tasks';

/**
 * Constant MIGRATIONS
 *
 * @description
 * Content-service migrations, applied to the temporary database.
 *
 * @type {string}
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../../../apps/content-service/migrations', import.meta.url),
);

describe('loadContentFixtures', (): void => {
  let directory: string;
  let url: string;

  beforeEach(async (): Promise<void> => {
    directory = mkdtempSync(join(tmpdir(), 'content-fixtures-'));
    url = `pglite:${directory}`;
    await migrateContent(url, MIGRATIONS);
  });

  afterEach((): void => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('loads the seed content and stores every SEO report through a refresh, twice in a row', async (): Promise<void> => {
    const first: SeoRefreshSummary = await loadContentFixtures(url, {
      siteOrigin: 'http://localhost:8080',
    });
    // Search Console and GA4 per range (7, 28, 90, 365 days), and one Web Vitals report.
    expect(first.refreshed).toBe(9);
    expect(first.failures).toEqual([]);
    const again: SeoRefreshSummary = await loadContentFixtures(url, {
      siteOrigin: 'http://localhost:8080',
    });
    expect(again.refreshed).toBe(9);

    const database: ContentDatabaseHandle = await openContentDatabase(url);
    try {
      expect((await new DrizzleArticleRepository(database.db).list()).length).toBeGreaterThan(0);
      const cache: SeoDashboardCache = await new DrizzleSeoReportStore(database.db).load('28d');
      expect(cache.searchConsole?.data).not.toBeNull();
      expect(cache.analytics?.data).not.toBeNull();
      expect(cache.webVitals?.data).not.toBeNull();
      expect(cache.refresh.finishedAt).not.toBeNull();
    } finally {
      await database.close();
    }
  });
});
