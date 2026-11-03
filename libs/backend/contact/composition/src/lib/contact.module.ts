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
  AdminContactController,
  CONTACT_HTTP_OPTIONS,
  ContactController,
  ContactJobs,
  contactProblemMapper,
} from '@vfortin/contact-adapters-in';
import {
  type ContactDatabaseHandle,
  DrizzleContactMessageRepository,
  DrizzleContactUnitOfWork,
  DrizzleNotificationJobRepository,
  type MailSenderOptions,
  NodemailerMailSender,
  openContactDatabase,
  PostgresRateLimiter,
  RandomIdGenerator,
  SystemClock,
} from '@vfortin/contact-adapters-out';
import {
  ArchiveContactMessage,
  type Clock,
  DeleteContactMessage,
  DeliverPendingNotifications,
  ListContactMessages,
  MarkContactMessageRead,
  type MailSender,
  PurgeExpiredMessages,
  SubmitContactMessage,
} from '@vfortin/contact-application';

/**
 * Constant CONTACT_DATABASE
 * @readonly
 *
 * @description
 * Injection token for the opened contact database handle.
 */
export const CONTACT_DATABASE: unique symbol = Symbol('CONTACT_DATABASE');

/**
 * Constant MAIL_SENDER
 * @readonly
 *
 * @description
 * Nest injection token for the configured outbound contact mail adapter.
 */
const MAIL_SENDER: unique symbol = Symbol('MAIL_SENDER');

/**
 * Constant CLOCK
 * @readonly
 *
 * @description
 * Nest injection token for the clock supplied to contact application use cases.
 */
const CLOCK: unique symbol = Symbol('CLOCK');

/**
 * Interface ContactModuleOptions
 * @interface ContactModuleOptions
 *
 * @description
 * Runtime settings for contact persistence, notifications, privacy and background workers.
 */
export interface ContactModuleOptions {
  // #region Properties
  /**
   * Property databaseUrl
   * @readonly
   *
   * @description
   * Database connection URL or development PGlite location used to open contact persistence.
   *
   * @type {string}
   */
  readonly databaseUrl: string;

  /**
   * Property mail
   * @readonly
   *
   * @description
   * SMTP or development JSON transport configuration for owner notifications.
   *
   * @type {MailSenderOptions}
   */
  readonly mail: MailSenderOptions;

  /**
   * Property clientKeySecret
   * @readonly
   *
   * @description
   * Secret key used to derive origin fingerprints for contact rate limiting.
   *
   * @type {string}
   */
  readonly clientKeySecret: string;

  /**
   * Property workers
   * @readonly
   *
   * @description
   * Whether this module registers scheduled delivery and retention workers.
   *
   * @type {boolean}
   */
  readonly workers: boolean;

  /**
   * Property prepare
   * @readonly
   *
   * @description
   * Optional database preparation callback used by tests to apply migrations before serving requests.
   *
   * @type {((database: ContactDatabaseHandle) => Promise<void>) | undefined}
   */
  readonly prepare?: (database: ContactDatabaseHandle) => Promise<void>;

  /**
   * Property mailSender
   * @readonly
   *
   * @description
   * Optional mail adapter replacement used by tests instead of constructing Nodemailer.
   *
   * @type {MailSender | undefined}
   */
  readonly mailSender?: MailSender;

  /**
   * Property clock
   * @readonly
   *
   * @description
   * Optional clock replacement used by deterministic tests.
   *
   * @type {Clock | undefined}
   */
  readonly clock?: Clock;
  // #endregion
}

/**
 * Class ContactModule
 * @class ContactModule
 *
 * @description
 * Wires contact persistence, application use cases, public and admin controllers, optional workers and readiness checks.
 */
@Module({})
export class ContactModule implements OnApplicationShutdown {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Retains the database handle so Nest shutdown can close it.
   * @param {ContactDatabaseHandle} database - Open contact database handle.
   */
  public constructor(@Inject(CONTACT_DATABASE) private readonly database: ContactDatabaseHandle) {}
  // #endregion

  // #region Methods
  /**
   * Method register
   * @method register
   * @static
   *
   * @description
   * Builds providers and controllers for the supplied database, mail and worker configuration.
   * Administration endpoints still require the platform admin-auth module in the host application.
   * @param {ContactModuleOptions} options - Runtime and test configuration for the contact context.
   * @returns {DynamicModule} Configured Nest dynamic module.
   */
  public static register(options: ContactModuleOptions): DynamicModule {
    return {
      module: ContactModule,
      imports: options.workers ? [ScheduleModule.forRoot()] : [],
      controllers: [ContactController, AdminContactController],
      providers: [
        {
          provide: CONTACT_DATABASE,
          useFactory: async (): Promise<ContactDatabaseHandle> => {
            const database: ContactDatabaseHandle = await openContactDatabase(options.databaseUrl);
            await options.prepare?.(database);
            return database;
          },
        },
        {
          provide: MAIL_SENDER,
          useFactory: (): MailSender => {
            const logger: Logger = new Logger('MailSender');
            return (
              options.mailSender ??
              new NodemailerMailSender(options.mail, (l): void => logger.warn(l))
            );
          },
        },
        { provide: CLOCK, useFactory: (): Clock => options.clock ?? new SystemClock() },
        {
          provide: SubmitContactMessage,
          inject: [CONTACT_DATABASE, CLOCK],
          useFactory: (database: ContactDatabaseHandle, clock: Clock): SubmitContactMessage =>
            new SubmitContactMessage(
              new DrizzleContactUnitOfWork(database.db),
              new PostgresRateLimiter(database.db),
              clock,
              new RandomIdGenerator(),
            ),
        },
        {
          provide: DeliverPendingNotifications,
          inject: [CONTACT_DATABASE, MAIL_SENDER, CLOCK],
          useFactory: (
            database: ContactDatabaseHandle,
            mailer: MailSender,
            clock: Clock,
          ): DeliverPendingNotifications =>
            new DeliverPendingNotifications(
              new DrizzleNotificationJobRepository(database.db),
              mailer,
              clock,
            ),
        },
        {
          provide: PurgeExpiredMessages,
          inject: [CONTACT_DATABASE, CLOCK],
          useFactory: (database: ContactDatabaseHandle, clock: Clock): PurgeExpiredMessages =>
            new PurgeExpiredMessages(
              new DrizzleContactMessageRepository(database.db),
              new PostgresRateLimiter(database.db),
              clock,
            ),
        },
        ...[
          ListContactMessages,
          MarkContactMessageRead,
          ArchiveContactMessage,
          DeleteContactMessage,
        ].map((useCase) => ({
          provide: useCase,
          inject: [CONTACT_DATABASE],
          useFactory: (
            database: ContactDatabaseHandle,
          ):
            | ListContactMessages
            | MarkContactMessageRead
            | ArchiveContactMessage
            | DeleteContactMessage => new useCase(new DrizzleContactMessageRepository(database.db)),
        })),
        {
          provide: CONTACT_HTTP_OPTIONS,
          useValue: { clientKeySecret: options.clientKeySecret },
        },
        {
          provide: READINESS_CHECKS,
          inject: [CONTACT_DATABASE],
          useFactory: (database: ContactDatabaseHandle): ReadinessCheck[] => [
            databaseReadinessCheck(database),
          ],
        },
        ...(options.workers ? [ContactJobs] : []),
        { provide: PROBLEM_MAPPER, useValue: contactProblemMapper },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
      exports: [READINESS_CHECKS, DeliverPendingNotifications, PurgeExpiredMessages],
    };
  }

  /**
   * Method onApplicationShutdown
   * @method onApplicationShutdown
   *
   * @description
   * Closes the database handle when Nest shuts down the application.
   * @returns {Promise<void>} Completion after the connection is closed.
   */
  public async onApplicationShutdown(): Promise<void> {
    await this.database.close();
  }
  // #endregion
}
