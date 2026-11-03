import { type DynamicModule, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PROBLEM_MAPPER, ProblemDetailsFilter } from '@vfortin/backend-http';
import { READINESS_CHECKS, type ReadinessCheck } from '@vfortin/backend-observability';
import { databaseReadinessCheck } from '@vfortin/backend-persistence';
import {
  ADMIN_AUDIENCE,
  AuthController,
  IDENTITY_HTTP_OPTIONS,
  identityProblemMapper,
} from '@vfortin/identity-adapters-in';
import {
  DrizzleIdentityUnitOfWork,
  type IdentityDatabaseHandle,
  JoseTokenSigner,
  RandomIdGenerator,
  RfcTotpVerifier,
  ScryptPasswordHasher,
  Sha256RefreshTokenCodec,
  type SigningKeys,
  SystemClock,
  loadSigningKeys,
  openIdentityDatabase,
} from '@vfortin/identity-adapters-out';
import {
  type Clock,
  type IdentityUnitOfWork,
  Login,
  Logout,
  RefreshSession,
  type SessionServices,
  VerifyLoginCode,
} from '@vfortin/identity-application';
import { randomBytes } from 'node:crypto';

/**
 * Constant IDENTITY_DATABASE
 *
 * @description
 * Injection token for the identity database handle shared by the module providers.
 *
 * @type {symbol}
 */
export const IDENTITY_DATABASE: unique symbol = Symbol('IDENTITY_DATABASE');

/**
 * Constant SIGNING_KEYS
 *
 * @description
 * Private injection token for the loaded signing key pair and public JWKS.
 *
 * @type {symbol}
 */
const SIGNING_KEYS: unique symbol = Symbol('SIGNING_KEYS');

/**
 * Constant SESSION_SERVICES
 *
 * @description
 * Private injection token for the session signer, refresh codec and identifier generator.
 *
 * @type {symbol}
 */
const SESSION_SERVICES: unique symbol = Symbol('SESSION_SERVICES');

/**
 * Constant UNIT_OF_WORK
 *
 * @description
 * Private injection token for the transaction-scoped identity repositories.
 *
 * @type {symbol}
 */
const UNIT_OF_WORK: unique symbol = Symbol('IDENTITY_UNIT_OF_WORK');

/**
 * Constant CLOCK
 *
 * @description
 * Private injection token for the clock shared by identity use cases.
 *
 * @type {symbol}
 */
const CLOCK: unique symbol = Symbol('CLOCK');

/**
 * Interface IdentityModuleOptions
 * @interface IdentityModuleOptions
 *
 * @description
 * Runtime settings used by `IdentityModule.register()` to build database, signing, cookie and test providers.
 */
export interface IdentityModuleOptions {
  // #region Properties
  /**
   * Property databaseUrl
   * @readonly
   *
   * @description
   * Connection URL used to open the identity database.
   *
   * @type {string}
   */
  readonly databaseUrl: string;

  /**
   * Property keysDir
   * @readonly
   *
   * @description
   * Directory containing Ed25519 key files named by key identifier.
   *
   * @type {string}
   */
  readonly keysDir: string;

  /**
   * Property signingKid
   * @readonly
   *
   * @description
   * Key identifier selecting the current private signing key from the configured directory.
   *
   * @type {string}
   */
  readonly signingKid: string;

  /**
   * Property issuer
   * @readonly
   *
   * @description
   * Issuer claim (`iss`) embedded in newly signed access tokens.
   *
   * @type {string}
   */
  readonly issuer: string;

  /**
   * Property cookieSecure
   * @readonly
   *
   * @description
   * Controls the identity cookies: `Secure` with the `__Host-` prefix and `Path=/` when true, plain
   * names on `/api/auth` for HTTP development when false.
   *
   * @type {boolean}
   */
  readonly cookieSecure: boolean;

  /**
   * Property prepare
   * @readonly
   *
   * @description
   * Optional database preparation hook run after opening the handle, primarily for test migrations.
   *
   * @type {((database: IdentityDatabaseHandle) => Promise<void>) | undefined}
   */
  readonly prepare?: (database: IdentityDatabaseHandle) => Promise<void>;

  /**
   * Property clock
   * @readonly
   *
   * @description
   * Optional clock override, such as a fixed clock in tests; defaults to `SystemClock`.
   *
   * @type {Clock | undefined}
   */
  readonly clock?: Clock;
  // #endregion
}

/**
 * Class IdentityModule
 * @class IdentityModule
 * @implements OnApplicationShutdown
 *
 * @description
 * Composes identity persistence, authentication use cases, signing-key publication and HTTP problem mapping into a Nest dynamic module.
 */
@Module({})
export class IdentityModule implements OnApplicationShutdown {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Retains the opened database handle so it can be closed during Nest shutdown.
   *
   * @param {IdentityDatabaseHandle} database - Database handle created by the module provider.
   */
  public constructor(
    @Inject(IDENTITY_DATABASE) private readonly database: IdentityDatabaseHandle,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method register
   * @method register
   * @static
   *
   * @description
   * Builds the dynamic module providers from runtime options, opening persistence and wiring use cases to adapters. Optional preparation and clock overrides support integration tests.
   *
   * @param {IdentityModuleOptions} options - Database, key, issuer and cookie settings for this module instance.
   *
   * @returns {DynamicModule} Nest module metadata with controller, providers and readiness export.
   */
  public static register(options: IdentityModuleOptions): DynamicModule {
    const hasher: ScryptPasswordHasher = new ScryptPasswordHasher();
    return {
      module: IdentityModule,
      controllers: [AuthController],
      providers: [
        {
          provide: IDENTITY_DATABASE,
          useFactory: async (): Promise<IdentityDatabaseHandle> => {
            const database: IdentityDatabaseHandle = await openIdentityDatabase(
              options.databaseUrl,
            );
            await options.prepare?.(database);
            return database;
          },
        },
        {
          provide: SIGNING_KEYS,
          useFactory: (): Promise<SigningKeys> =>
            loadSigningKeys(options.keysDir, options.signingKid),
        },
        { provide: CLOCK, useFactory: (): Clock => options.clock ?? new SystemClock() },
        {
          provide: UNIT_OF_WORK,
          inject: [IDENTITY_DATABASE],
          useFactory: (database: IdentityDatabaseHandle): DrizzleIdentityUnitOfWork =>
            new DrizzleIdentityUnitOfWork(database.db),
        },
        {
          provide: SESSION_SERVICES,
          inject: [SIGNING_KEYS],
          useFactory: (keys: SigningKeys): SessionServices => ({
            signer: new JoseTokenSigner(keys, options.issuer, ADMIN_AUDIENCE),
            codec: new Sha256RefreshTokenCodec(),
            ids: new RandomIdGenerator(),
          }),
        },
        {
          provide: Login,
          inject: [UNIT_OF_WORK, SESSION_SERVICES, CLOCK],
          useFactory: async (
            unitOfWork: IdentityUnitOfWork,
            services: SessionServices,
            clock: Clock,
          ): Promise<Login> =>
            new Login(
              unitOfWork,
              services,
              hasher,
              clock,
              // Hash of a throwaway secret: an unknown address costs as much as a wrong password.
              await hasher.hash(randomBytes(16).toString('hex')),
            ),
        },
        {
          provide: VerifyLoginCode,
          inject: [UNIT_OF_WORK, SESSION_SERVICES, CLOCK],
          useFactory: (
            unitOfWork: IdentityUnitOfWork,
            services: SessionServices,
            clock: Clock,
          ): VerifyLoginCode =>
            new VerifyLoginCode(unitOfWork, services, new RfcTotpVerifier(), clock),
        },
        {
          provide: RefreshSession,
          inject: [UNIT_OF_WORK, SESSION_SERVICES, CLOCK],
          useFactory: (
            unitOfWork: IdentityUnitOfWork,
            services: SessionServices,
            clock: Clock,
          ): RefreshSession => new RefreshSession(unitOfWork, services, clock),
        },
        {
          provide: Logout,
          inject: [UNIT_OF_WORK, SESSION_SERVICES, CLOCK],
          useFactory: (
            unitOfWork: IdentityUnitOfWork,
            services: SessionServices,
            clock: Clock,
          ): Logout => new Logout(unitOfWork, services.codec, clock),
        },
        {
          provide: IDENTITY_HTTP_OPTIONS,
          inject: [SIGNING_KEYS],
          useFactory: (keys: SigningKeys) => ({
            cookieSecure: options.cookieSecure,
            jwks: keys.jwks,
          }),
        },
        {
          provide: READINESS_CHECKS,
          inject: [IDENTITY_DATABASE],
          useFactory: (database: IdentityDatabaseHandle): ReadinessCheck[] => [
            databaseReadinessCheck(database),
          ],
        },
        { provide: PROBLEM_MAPPER, useValue: identityProblemMapper },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
      exports: [READINESS_CHECKS],
    };
  }

  /**
   * Method onApplicationShutdown
   * @method onApplicationShutdown
   *
   * @description
   * Closes the database handle when Nest shuts down the module.
   *
   * @returns {Promise<void>} Completion after the handle is closed.
   */
  public async onApplicationShutdown(): Promise<void> {
    await this.database.close();
  }
  // #endregion
}
