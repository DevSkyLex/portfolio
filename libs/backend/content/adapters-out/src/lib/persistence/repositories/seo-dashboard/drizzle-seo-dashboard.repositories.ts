import type {
  AnalyticsData,
  CachedSeoReport,
  SearchConsoleData,
  SeoDashboardCache,
  SeoRefreshState,
  SeoReport,
  SeoReportStore,
  SeoSource,
  SeoSourceFailure,
  WebVitalsReport,
} from '@vfortin/content-application';
import type { SeoRange } from '@vfortin/content-domain';
import { and, eq, isNull, lte, or, sql } from 'drizzle-orm';
import type { ContentDatabase } from '@internal/content-adapters-out/lib/persistence/database/content-database';
import {
  seoRefresh,
  seoReports,
} from '@internal/content-adapters-out/lib/persistence/schema/content.schema';

/**
 * Type SeoReportRow
 *
 * @description
 * Stored row of `content.seo_reports`.
 */
type SeoReportRow = typeof seoReports.$inferSelect;

/**
 * Constant ALL_RANGES
 *
 * @description
 * Stored range of the Web Vitals entry, which covers no report window of its own.
 */
const ALL_RANGES = 'all' as const;

/**
 * Function toCached
 *
 * @description
 * Maps a row to a cache entry of the expected report type.
 *
 * @template T - Report data stored by the row's source.
 * @param {SeoReportRow | undefined} row - Stored row.
 * @returns {CachedSeoReport<T> | null} Entry, or `null` without a row.
 */
function toCached<T>(row: SeoReportRow | undefined): CachedSeoReport<T> | null {
  if (row === undefined) return null;
  return {
    data: (row.data ?? null) as T | null,
    fetchedAt: row.fetchedAt,
    failure: row.failure,
    attemptedAt: row.attemptedAt,
  };
}

/**
 * Class DrizzleSeoReportStore
 * @class DrizzleSeoReportStore
 *
 * @description
 * SEO dashboard cache over `content.seo_reports` and the singleton `content.seo_refresh` row (D47).
 * Writes are upserts on the source and range, so a refresh never needs a prior read.
 */
export class DrizzleSeoReportStore implements SeoReportStore {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the database handle.
   *
   * @param {ContentDatabase} db - Typed Drizzle database.
   */
  public constructor(private readonly db: ContentDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method load
   * @method load
   *
   * @description
   * Reads the Search Console and GA4 rows of the range, the Web Vitals row and the refresh state.
   *
   * @param {SeoRange} range - Report length.
   * @returns {Promise<SeoDashboardCache>} Entries.
   */
  public async load(range: SeoRange): Promise<SeoDashboardCache> {
    const rows: SeoReportRow[] = await this.db
      .select()
      .from(seoReports)
      .where(
        or(
          and(eq(seoReports.source, 'search-console'), eq(seoReports.range, range)),
          and(eq(seoReports.source, 'analytics'), eq(seoReports.range, range)),
          and(eq(seoReports.source, 'web-vitals'), eq(seoReports.range, ALL_RANGES)),
        ),
      );
    const of = (source: SeoSource): SeoReportRow | undefined =>
      rows.find((row: SeoReportRow): boolean => row.source === source);
    return {
      searchConsole: toCached<SearchConsoleData>(of('search-console')),
      analytics: toCached<AnalyticsData>(of('analytics')),
      webVitals: toCached<WebVitalsReport>(of('web-vitals')),
      refresh: await this.refreshState(),
    };
  }

  /**
   * Method saveReport
   * @method saveReport
   *
   * @description
   * Upserts the row of the report's source and range with the report, clearing its failure.
   *
   * @param {SeoReport} report - Fetched report.
   * @param {Date} at - Fetch time.
   * @returns {Promise<void>} Completion after the write.
   */
  public async saveReport(report: SeoReport, at: Date): Promise<void> {
    const values: { data: unknown; fetchedAt: Date; failure: null; attemptedAt: Date } = {
      data: report.data,
      fetchedAt: at,
      failure: null,
      attemptedAt: at,
    };
    await this.db
      .insert(seoReports)
      .values({ source: report.source, range: report.range ?? ALL_RANGES, ...values })
      .onConflictDoUpdate({ target: [seoReports.source, seoReports.range], set: values });
  }

  /**
   * Method saveFailure
   * @method saveFailure
   *
   * @description
   * Upserts the failure and attempt time of a source and range, keeping the stored report.
   *
   * @param {SeoSource} source - Failed source.
   * @param {SeoRange | null} range - Range, `null` for the Web Vitals.
   * @param {SeoSourceFailure} failure - Failure.
   * @param {Date} at - Attempt time.
   * @returns {Promise<void>} Completion after the write.
   */
  public async saveFailure(
    source: SeoSource,
    range: SeoRange | null,
    failure: SeoSourceFailure,
    at: Date,
  ): Promise<void> {
    await this.db
      .insert(seoReports)
      .values({ source, range: range ?? ALL_RANGES, failure, attemptedAt: at })
      .onConflictDoUpdate({
        target: [seoReports.source, seoReports.range],
        set: { failure, attemptedAt: at },
      });
  }

  /**
   * Method claimRefresh
   * @method claimRefresh
   *
   * @description
   * Writes the start in one statement that only updates the row when no refresh started after
   * `notBefore`; the row lock of the conflicting update serializes concurrent claims.
   *
   * @param {Date} now - Start time.
   * @param {Date} notBefore - Latest previous start allowing a new refresh.
   * @returns {Promise<boolean>} Whether the refresh was claimed.
   */
  public async claimRefresh(now: Date, notBefore: Date): Promise<boolean> {
    const rows: { id: number }[] = await this.db
      .insert(seoRefresh)
      .values({ id: 1, startedAt: now })
      .onConflictDoUpdate({
        target: seoRefresh.id,
        set: { startedAt: now },
        setWhere: sql`(${isNull(seoRefresh.startedAt)} or ${lte(seoRefresh.startedAt, notBefore)})`,
      })
      .returning({ id: seoRefresh.id });
    return rows.length > 0;
  }

  /**
   * Method finishRefresh
   * @method finishRefresh
   *
   * @description
   * Records the end of the refresh.
   *
   * @param {Date} at - End time.
   * @returns {Promise<void>} Completion after the write.
   */
  public async finishRefresh(at: Date): Promise<void> {
    await this.db.update(seoRefresh).set({ finishedAt: at }).where(eq(seoRefresh.id, 1));
  }

  /**
   * Method refreshState
   * @method refreshState
   *
   * @description
   * Reads the singleton row, empty before the first refresh.
   *
   * @returns {Promise<SeoRefreshState>} State.
   */
  public async refreshState(): Promise<SeoRefreshState> {
    const [row] = await this.db.select().from(seoRefresh).where(eq(seoRefresh.id, 1));
    return { startedAt: row?.startedAt ?? null, finishedAt: row?.finishedAt ?? null };
  }
  // #endregion
}
