import { type DynamicModule, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { McpAuthModule, type McpAuthOptions } from '@vfortin/backend-auth';
import { PROBLEM_MAPPER, ProblemDetailsFilter } from '@vfortin/backend-http';
import { READINESS_CHECKS, type ReadinessCheck } from '@vfortin/backend-observability';
import { databaseReadinessCheck } from '@vfortin/backend-persistence';
import {
  AdminContentController,
  AdminPublicationController,
  AdminLegalController,
  AdminMediaController,
  AdminProfileController,
  AdminSeoDashboardController,
  AdminTimelineController,
  ContentController,
  ContentMcpController,
  ContentMcpTools,
  MediaPurgeJobs,
  SeoDashboardJobs,
  contentProblemMapper,
} from '@vfortin/content-adapters-in';
import {
  type ContentDatabaseHandle,
  DiskMediaStorage,
  DrizzleContentSnapshotReader,
  DrizzlePublicationRepository,
  DrizzleContentUnitOfWork,
  DrizzleLegalDocumentRepository,
  DrizzleMediaRepository,
  DrizzleProfileRepository,
  DrizzleProjectRepository,
  DrizzleSeoReportStore,
  DrizzleSiteTextsUnitOfWork,
  DrizzleTimelineEntryRepository,
  DrizzleTimelineListRepository,
  DrizzleTimelineUnitOfWork,
  DemoAnalyticsReader,
  DemoSearchConsoleReader,
  DemoWebVitalsReader,
  GoogleAnalyticsReader,
  type GoogleAccessTokens,
  GoogleSearchConsoleReader,
  GoogleServiceAccountTokens,
  PageSpeedWebVitalsReader,
  RandomIdGenerator,
  SharpImageProcessor,
  SystemClock,
  openContentDatabase,
} from '@vfortin/content-adapters-out';
import {
  type Clock,
  CreateTimelineEntry,
  DeleteTimelineEntry,
  GetAdminLegalDocument,
  GetAdminProfile,
  GetAdminProject,
  GetAdminTimelineEntry,
  GetPublishedContent,
  ManagePublication,
  GetSeoDashboard,
  type ImageProcessor,
  ListAdminProjects,
  ListAdminTimeline,
  type MediaStorage,
  PublishProject,
  PurgeMedia,
  RefreshSeoDashboard,
  ReorderTimeline,
  ReviseLegalDocument,
  ReviseProfile,
  ReviseProject,
  CreateProject,
  ReviseTimelineEntry,
  type AnalyticsReader,
  type SearchConsoleReader,
  type SeoSourceSetup,
  type SeoSources,
  type WebVitalsReader,
  UnpublishProject,
  UploadMedia,
} from '@vfortin/content-application';

/**
 * Constant CONTENT_DATABASE
 *
 * @description
 * Nest injection token for the content database handle shared by repository providers.
 */
export const CONTENT_DATABASE: unique symbol = Symbol('CONTENT_DATABASE');

/**
 * Constant CLOCK
 *
 * @description
 * Private Nest injection token for the clock used by content commands and scheduled jobs.
 */
const CLOCK: unique symbol = Symbol('CLOCK');

/**
 * Constant MEDIA_STORAGE
 *
 * @description
 * Private Nest injection token for the media file storage shared by the upload and the purge.
 */
const MEDIA_STORAGE: unique symbol = Symbol('MEDIA_STORAGE');

/**
 * Constant SEO_SOURCES
 *
 * @description
 * Private Nest injection token for the Google sources of the SEO dashboard (D47).
 */
const SEO_SOURCES: unique symbol = Symbol('SEO_SOURCES');

/**
 * Constant SEO_SETTINGS
 *
 * @description
 * content-service environment variables of each SEO dashboard setting, named to the owner by a
 * `not-configured` section.
 */
export const SEO_SETTINGS = {
  credentials: 'SEO_GOOGLE_CREDENTIALS_PATH',
  searchConsole: 'SEO_SEARCH_CONSOLE_PROPERTY',
  analytics: 'SEO_GA4_PROPERTY_ID',
  pageSpeed: 'SEO_PAGESPEED_API_KEY',
} as const;

/**
 * Interface ContentSeoOptions
 * @interface ContentSeoOptions
 *
 * @description
 * Settings of the SEO dashboard (D47); every Google source is optional.
 */
export interface ContentSeoOptions {
  // #region Properties
  /**
   * Property siteOrigin
   * @readonly
   *
   * @description
   * Public origin without a trailing slash, for the default Web Vitals URLs.
   */
  readonly siteOrigin: string;

  /**
   * Property credentialsPath
   * @readonly
   *
   * @description
   * Service account key file (a Docker secret), read by the token adapter on first use only;
   * `null` leaves Search Console and GA4 unconfigured.
   */
  readonly credentialsPath: string | null;

  /**
   * Property searchConsoleProperty
   * @readonly
   *
   * @description
   * Search Console property (`sc-domain:…` or a URL prefix), or `null`.
   */
  readonly searchConsoleProperty: string | null;

  /**
   * Property analyticsPropertyId
   * @readonly
   *
   * @description
   * Numeric GA4 property identifier, or `null`.
   */
  readonly analyticsPropertyId: string | null;

  /**
   * Property pageSpeedApiKey
   * @readonly
   *
   * @description
   * PageSpeed Insights API key, or `null`.
   */
  readonly pageSpeedApiKey: string | null;

  /**
   * Property webVitalsUrls
   * @readonly
   *
   * @description
   * Key URLs measured by PageSpeed Insights; empty for the home pages and the first published
   * project.
   */
  readonly webVitalsUrls: readonly string[];

  /**
   * Property demoData
   * @readonly
   *
   * @description
   * Replaces each unconfigured Google source by demonstration figures (D52), for local development
   * only; the dashboard announces them.
   */
  readonly demoData?: boolean;

  /**
   * Property sources
   * @readonly
   *
   * @description
   * Optional source override for tests (no Google call).
   */
  readonly sources?: SeoSources;
  // #endregion
}

/**
 * Constant UNCONFIGURED_SEO
 *
 * @description
 * SEO settings of a module registered without them: no Google source, the production origin.
 */
const UNCONFIGURED_SEO: ContentSeoOptions = {
  siteOrigin: 'https://valentin-fortin.pro',
  credentialsPath: null,
  searchConsoleProperty: null,
  analyticsPropertyId: null,
  pageSpeedApiKey: null,
  webVitalsUrls: [],
};

/**
 * Function seoSources
 *
 * @description
 * Builds the Google sources from the settings: a source with all its settings gets its adapter,
 * the others list what is missing. Search Console and GA4 share one service account token source.
 *
 * @param {ContentSeoOptions} seo - Settings.
 * @returns {SeoSources} Sources.
 */
export function seoSources(seo: ContentSeoOptions): SeoSources {
  if (seo.sources) return seo.sources;
  const tokens: GoogleAccessTokens | null =
    seo.credentialsPath === null ? null : new GoogleServiceAccountTokens(seo.credentialsPath);
  const missing = (value: string | null, name: string): string[] => {
    const names: string[] = tokens === null ? [SEO_SETTINGS.credentials] : [];
    return value === null ? [...names, name] : names;
  };
  // An unconfigured source falls back on demonstration figures when they are enabled (D52).
  const demo = <R>(missing: readonly string[], reader: () => R): SeoSourceSetup<R> =>
    seo.demoData === true ? { reader: reader(), demo: true } : { missing };
  return {
    searchConsole:
      tokens !== null && seo.searchConsoleProperty !== null
        ? { reader: new GoogleSearchConsoleReader({ property: seo.searchConsoleProperty, tokens }) }
        : demo(
            missing(seo.searchConsoleProperty, SEO_SETTINGS.searchConsole),
            (): SearchConsoleReader => new DemoSearchConsoleReader(seo.siteOrigin),
          ),
    analytics:
      tokens !== null && seo.analyticsPropertyId !== null
        ? { reader: new GoogleAnalyticsReader({ propertyId: seo.analyticsPropertyId, tokens }) }
        : demo(
            missing(seo.analyticsPropertyId, SEO_SETTINGS.analytics),
            (): AnalyticsReader => new DemoAnalyticsReader(),
          ),
    webVitals:
      seo.pageSpeedApiKey !== null
        ? { reader: new PageSpeedWebVitalsReader({ apiKey: seo.pageSpeedApiKey }) }
        : demo([SEO_SETTINGS.pageSpeed], (): WebVitalsReader => new DemoWebVitalsReader()),
  };
}

/**
 * Interface ContentModuleOptions
 * @interface ContentModuleOptions
 *
 * @description
 * Runtime configuration for connecting the content module to persistence and scheduled jobs.
 */
export interface ContentModuleOptions {
  /** Enables the stateless MCP resource with the identity service's issuer and keys (D49). */
  readonly mcp?: McpAuthOptions;
  // #region Properties
  /**
   * Property databaseUrl
   * @readonly
   *
   * @description
   * Database URL; production uses PostgreSQL, while tests and development may use PGlite.
   */
  readonly databaseUrl: string;

  /**
   * Property workers
   * @readonly
   *
   * @description
   * Enables scheduled media purge and SEO refresh; tests can disable the workers.
   */
  readonly workers: boolean;

  /**
   * Property mediaDirectory
   * @readonly
   *
   * @description
   * Directory of the uploaded media files (`CONTENT_MEDIA_DIR`), served at `/media/` (D40).
   */
  readonly mediaDirectory: string;

  /**
   * Property imageProcessor
   * @readonly
   *
   * @description
   * Optional image processor override for tests; sharp otherwise.
   */
  readonly imageProcessor?: ImageProcessor;

  /**
   * Property prepare
   * @readonly
   *
   * @description
   * Optional database preparation callback invoked after opening the handle.
   */
  readonly prepare?: (database: ContentDatabaseHandle) => Promise<void>;

  /**
   * Property clock
   * @readonly
   *
   * @description
   * Optional clock override for deterministic tests.
   */
  readonly clock?: Clock;

  /**
   * Property seo
   * @readonly
   *
   * @description
   * SEO dashboard settings (D47); absent, no Google source is configured.
   */
  readonly seo?: ContentSeoOptions;
  // #endregion
}

/**
 * Class ContentModule
 * @class ContentModule
 *
 * @description
 * Wires content persistence, public queries, project, timeline, profile, legal and media
 * administration, the media purge and the SEO dashboard into Nest.
 */
@Module({})
export class ContentModule implements OnApplicationShutdown {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the database handle that the module closes during application shutdown.
   *
   * @param {ContentDatabaseHandle} database - Open content database handle.
   */
  public constructor(@Inject(CONTENT_DATABASE) private readonly database: ContentDatabaseHandle) {}
  // #endregion

  // #region Methods
  /**
   * Method register
   * @method register
   * @static
   *
   * @description
   * Creates a dynamic module with runtime-specific database and use-case providers.
   * Scheduled workers are registered only when enabled in the options.
   *
   * @param {ContentModuleOptions} options - Content infrastructure configuration.
   * @returns {DynamicModule} Nest dynamic module descriptor.
   */
  public static register(options: ContentModuleOptions): DynamicModule {
    const unitOfWork: (database: ContentDatabaseHandle) => DrizzleContentUnitOfWork = (
      database: ContentDatabaseHandle,
    ): DrizzleContentUnitOfWork => new DrizzleContentUnitOfWork(database.db);
    const seo: ContentSeoOptions = options.seo ?? UNCONFIGURED_SEO;
    return {
      module: ContentModule,
      imports: [
        ...(options.workers ? [ScheduleModule.forRoot()] : []),
        ...(options.mcp ? [McpAuthModule.forRoot(options.mcp)] : []),
      ],
      controllers: [
        ...(options.mcp ? [ContentMcpController] : []),
        ContentController,
        AdminContentController,
        AdminPublicationController,
        AdminTimelineController,
        AdminProfileController,
        AdminLegalController,
        AdminMediaController,
        AdminSeoDashboardController,
      ],
      providers: [
        {
          provide: ManagePublication,
          inject: [CONTENT_DATABASE],
          useFactory: (database: ContentDatabaseHandle): ManagePublication =>
            new ManagePublication(new DrizzlePublicationRepository(database.db)),
        },
        ...(options.mcp ? [ContentMcpTools] : []),
        {
          provide: CONTENT_DATABASE,
          useFactory: async (): Promise<ContentDatabaseHandle> => {
            const database: ContentDatabaseHandle = await openContentDatabase(options.databaseUrl);
            try {
              await options.prepare?.(database);
              await new DrizzlePublicationRepository(database.db).recover(
                options.clock?.now() ?? new Date(),
              );
              return database;
            } catch (error) {
              await database.close();
              throw error;
            }
          },
        },
        { provide: CLOCK, useFactory: (): Clock => options.clock ?? new SystemClock() },
        {
          provide: MEDIA_STORAGE,
          useFactory: (): MediaStorage => new DiskMediaStorage(options.mediaDirectory),
        },
        {
          provide: GetPublishedContent,
          inject: [CONTENT_DATABASE],
          useFactory: (database: ContentDatabaseHandle): GetPublishedContent =>
            new GetPublishedContent(new DrizzleContentSnapshotReader(database.db)),
        },
        {
          provide: ListAdminProjects,
          inject: [CONTENT_DATABASE],
          useFactory: (database: ContentDatabaseHandle): ListAdminProjects =>
            new ListAdminProjects(
              new DrizzleProjectRepository(database.db),
              new DrizzleMediaRepository(database.db),
            ),
        },
        {
          provide: GetAdminProject,
          inject: [CONTENT_DATABASE],
          useFactory: (database: ContentDatabaseHandle): GetAdminProject =>
            new GetAdminProject(
              new DrizzleProjectRepository(database.db),
              new DrizzleMediaRepository(database.db),
            ),
        },
        {
          provide: CreateProject,
          inject: [CONTENT_DATABASE],
          useFactory: (database: ContentDatabaseHandle): CreateProject =>
            new CreateProject(unitOfWork(database), new RandomIdGenerator()),
        },
        {
          provide: ReviseProject,
          inject: [CONTENT_DATABASE, CLOCK],
          useFactory: (database: ContentDatabaseHandle, clock: Clock): ReviseProject =>
            new ReviseProject(unitOfWork(database), clock),
        },
        {
          provide: PublishProject,
          inject: [CONTENT_DATABASE, CLOCK],
          useFactory: (database: ContentDatabaseHandle, clock: Clock): PublishProject =>
            new PublishProject(unitOfWork(database), clock),
        },
        {
          provide: UnpublishProject,
          inject: [CONTENT_DATABASE, CLOCK],
          useFactory: (database: ContentDatabaseHandle, clock: Clock): UnpublishProject =>
            new UnpublishProject(unitOfWork(database), clock),
        },
        {
          provide: ListAdminTimeline,
          inject: [CONTENT_DATABASE],
          useFactory: (database: ContentDatabaseHandle): ListAdminTimeline =>
            new ListAdminTimeline(
              new DrizzleTimelineEntryRepository(database.db),
              new DrizzleTimelineListRepository(database.db),
            ),
        },
        {
          provide: GetAdminTimelineEntry,
          inject: [CONTENT_DATABASE],
          useFactory: (database: ContentDatabaseHandle): GetAdminTimelineEntry =>
            new GetAdminTimelineEntry(new DrizzleTimelineEntryRepository(database.db)),
        },
        {
          provide: CreateTimelineEntry,
          inject: [CONTENT_DATABASE, CLOCK],
          useFactory: (database: ContentDatabaseHandle, clock: Clock): CreateTimelineEntry =>
            new CreateTimelineEntry(
              new DrizzleTimelineUnitOfWork(database.db),
              new RandomIdGenerator(),
              clock,
            ),
        },
        {
          provide: ReviseTimelineEntry,
          inject: [CONTENT_DATABASE, CLOCK],
          useFactory: (database: ContentDatabaseHandle, clock: Clock): ReviseTimelineEntry =>
            new ReviseTimelineEntry(new DrizzleTimelineUnitOfWork(database.db), clock),
        },
        {
          provide: DeleteTimelineEntry,
          inject: [CONTENT_DATABASE, CLOCK],
          useFactory: (database: ContentDatabaseHandle, clock: Clock): DeleteTimelineEntry =>
            new DeleteTimelineEntry(new DrizzleTimelineUnitOfWork(database.db), clock),
        },
        {
          provide: ReorderTimeline,
          inject: [CONTENT_DATABASE, CLOCK],
          useFactory: (database: ContentDatabaseHandle, clock: Clock): ReorderTimeline =>
            new ReorderTimeline(new DrizzleTimelineUnitOfWork(database.db), clock),
        },
        {
          provide: GetAdminProfile,
          inject: [CONTENT_DATABASE],
          useFactory: (database: ContentDatabaseHandle): GetAdminProfile =>
            new GetAdminProfile(new DrizzleProfileRepository(database.db)),
        },
        {
          provide: ReviseProfile,
          inject: [CONTENT_DATABASE, CLOCK],
          useFactory: (database: ContentDatabaseHandle, clock: Clock): ReviseProfile =>
            new ReviseProfile(new DrizzleSiteTextsUnitOfWork(database.db), clock),
        },
        {
          provide: GetAdminLegalDocument,
          inject: [CONTENT_DATABASE],
          useFactory: (database: ContentDatabaseHandle): GetAdminLegalDocument =>
            new GetAdminLegalDocument(new DrizzleLegalDocumentRepository(database.db)),
        },
        {
          provide: ReviseLegalDocument,
          inject: [CONTENT_DATABASE, CLOCK],
          useFactory: (database: ContentDatabaseHandle, clock: Clock): ReviseLegalDocument =>
            new ReviseLegalDocument(new DrizzleSiteTextsUnitOfWork(database.db), clock),
        },
        {
          provide: UploadMedia,
          inject: [CONTENT_DATABASE, MEDIA_STORAGE, CLOCK],
          useFactory: (
            database: ContentDatabaseHandle,
            storage: MediaStorage,
            clock: Clock,
          ): UploadMedia =>
            new UploadMedia(
              new DrizzleMediaRepository(database.db),
              options.imageProcessor ?? new SharpImageProcessor(),
              storage,
              new RandomIdGenerator(),
              clock,
            ),
        },
        {
          provide: PurgeMedia,
          inject: [CONTENT_DATABASE, MEDIA_STORAGE, CLOCK],
          useFactory: (
            database: ContentDatabaseHandle,
            storage: MediaStorage,
            clock: Clock,
          ): PurgeMedia => new PurgeMedia(new DrizzleMediaRepository(database.db), storage, clock),
        },
        { provide: SEO_SOURCES, useFactory: (): SeoSources => seoSources(seo) },
        {
          provide: GetSeoDashboard,
          inject: [CONTENT_DATABASE, SEO_SOURCES, CLOCK],
          useFactory: (
            database: ContentDatabaseHandle,
            sources: SeoSources,
            clock: Clock,
          ): GetSeoDashboard =>
            new GetSeoDashboard(
              new DrizzleSeoReportStore(database.db),
              sources,
              new DrizzleProjectRepository(database.db),
              clock,
            ),
        },
        {
          provide: RefreshSeoDashboard,
          inject: [CONTENT_DATABASE, SEO_SOURCES, CLOCK],
          useFactory: (
            database: ContentDatabaseHandle,
            sources: SeoSources,
            clock: Clock,
          ): RefreshSeoDashboard =>
            new RefreshSeoDashboard(
              new DrizzleSeoReportStore(database.db),
              sources,
              new DrizzleProjectRepository(database.db),
              clock,
              { siteOrigin: seo.siteOrigin, webVitalsUrls: seo.webVitalsUrls },
            ),
        },
        {
          provide: READINESS_CHECKS,
          inject: [CONTENT_DATABASE],
          useFactory: (database: ContentDatabaseHandle): ReadinessCheck[] => [
            databaseReadinessCheck(database),
          ],
        },
        ...(options.workers ? [MediaPurgeJobs, SeoDashboardJobs] : []),
        { provide: PROBLEM_MAPPER, useValue: contentProblemMapper },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
      exports: [READINESS_CHECKS, PurgeMedia],
    };
  }

  /**
   * Method onApplicationShutdown
   * @method onApplicationShutdown
   *
   * @description
   * Closes the content database connection when Nest shuts the application down.
   *
   * @returns {Promise<void>} Completion after the connection has closed.
   */
  public async onApplicationShutdown(): Promise<void> {
    await this.database.close();
  }
  // #endregion
}
