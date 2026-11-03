import {
  type DynamicModule,
  Inject,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { PROBLEM_MAPPER, ProblemDetailsFilter } from '@vfortin/backend-http';
import { READINESS_CHECKS, type ReadinessCheck } from '@vfortin/backend-observability';
import { databaseReadinessCheck } from '@vfortin/backend-persistence';
import {
  AdminContentController,
  ContentController,
  SiteBuildJobs,
  contentProblemMapper,
} from '@vfortin/content-adapters-in';
import {
  type ContentDatabaseHandle,
  DrizzleContentSnapshotReader,
  DrizzleContentUnitOfWork,
  DrizzleProjectRepository,
  DrizzleSiteBuildRequestRepository,
  type GithubDispatchOptions,
  GithubSiteBuildDispatcher,
  LogSiteBuildDispatcher,
  SystemClock,
  openContentDatabase,
} from '@vfortin/content-adapters-out';
import {
  type Clock,
  DispatchSiteBuild,
  GetAdminProject,
  GetPublishedContent,
  ListAdminProjects,
  PublishProject,
  ReviseProject,
  type SiteBuildDispatcher,
  UnpublishProject,
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
 * Private Nest injection token for the clock used by content commands and the rebuild worker.
 */
const CLOCK: unique symbol = Symbol('CLOCK');

/**
 * Interface ContentModuleOptions
 * @interface ContentModuleOptions
 *
 * @description
 * Runtime configuration for connecting the content module to persistence and rebuild dispatch.
 */
export interface ContentModuleOptions {
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
   * Property siteBuild
   * @readonly
   *
   * @description
   * GitHub workflow configuration; `null` selects log-only dispatch when no dispatcher override is provided.
   */
  readonly siteBuild: GithubDispatchOptions | null;

  /**
   * Property workers
   * @readonly
   *
   * @description
   * Enables scheduled outbox processing; tests can disable the worker.
   */
  readonly workers: boolean;

  /**
   * Property prepare
   * @readonly
   *
   * @description
   * Optional database preparation callback invoked after opening the handle.
   */
  readonly prepare?: (database: ContentDatabaseHandle) => Promise<void>;

  /**
   * Property siteBuildDispatcher
   * @readonly
   *
   * @description
   * Optional dispatcher override for tests or another runtime integration.
   */
  readonly siteBuildDispatcher?: SiteBuildDispatcher;

  /**
   * Property clock
   * @readonly
   *
   * @description
   * Optional clock override for deterministic tests.
   */
  readonly clock?: Clock;
  // #endregion
}

/**
 * Class ContentModule
 * @class ContentModule
 *
 * @description
 * Wires content persistence, public queries, project administration and rebuild dispatch into Nest.
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
   * Creates a dynamic module with runtime-specific database, use-case and dispatcher providers.
   * Scheduled workers are registered only when enabled in the options.
   *
   * @param {ContentModuleOptions} options - Content infrastructure configuration.
   * @returns {DynamicModule} Nest dynamic module descriptor.
   */
  public static register(options: ContentModuleOptions): DynamicModule {
    const unitOfWork: (database: ContentDatabaseHandle) => DrizzleContentUnitOfWork = (
      database: ContentDatabaseHandle,
    ): DrizzleContentUnitOfWork => new DrizzleContentUnitOfWork(database.db);
    return {
      module: ContentModule,
      imports: options.workers ? [ScheduleModule.forRoot()] : [],
      controllers: [ContentController, AdminContentController],
      providers: [
        {
          provide: CONTENT_DATABASE,
          useFactory: async (): Promise<ContentDatabaseHandle> => {
            const database: ContentDatabaseHandle = await openContentDatabase(options.databaseUrl);
            await options.prepare?.(database);
            return database;
          },
        },
        { provide: CLOCK, useFactory: (): Clock => options.clock ?? new SystemClock() },
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
            new ListAdminProjects(new DrizzleProjectRepository(database.db)),
        },
        {
          provide: GetAdminProject,
          inject: [CONTENT_DATABASE],
          useFactory: (database: ContentDatabaseHandle): GetAdminProject =>
            new GetAdminProject(new DrizzleProjectRepository(database.db)),
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
          provide: DispatchSiteBuild,
          inject: [CONTENT_DATABASE, CLOCK],
          useFactory: (database: ContentDatabaseHandle, clock: Clock): DispatchSiteBuild => {
            const logger: Logger = new Logger('SiteBuild');
            const dispatcher: SiteBuildDispatcher =
              options.siteBuildDispatcher ??
              (options.siteBuild
                ? new GithubSiteBuildDispatcher(options.siteBuild)
                : new LogSiteBuildDispatcher((line: string): void => logger.log(line)));
            return new DispatchSiteBuild(
              new DrizzleSiteBuildRequestRepository(database.db),
              dispatcher,
              clock,
            );
          },
        },
        {
          provide: READINESS_CHECKS,
          inject: [CONTENT_DATABASE],
          useFactory: (database: ContentDatabaseHandle): ReadinessCheck[] => [
            databaseReadinessCheck(database),
          ],
        },
        ...(options.workers ? [SiteBuildJobs] : []),
        { provide: PROBLEM_MAPPER, useValue: contentProblemMapper },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
      exports: [READINESS_CHECKS, DispatchSiteBuild],
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
