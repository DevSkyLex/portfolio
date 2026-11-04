import { type DynamicModule, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import {
  ADMIN_TOKEN_VERIFIER,
  AdminGuard,
  type AdminTokenVerifier,
  JoseAdminTokenVerifier,
} from '@vfortin/backend-auth';
import { PROBLEM_MAPPER, ProblemDetailsFilter } from '@vfortin/backend-http';
import { READINESS_CHECKS, type ReadinessCheck } from '@vfortin/backend-observability';
import { databaseReadinessCheck } from '@vfortin/backend-persistence';
import {
  ADMIN_AUDIENCE,
  AuthController,
  ConnectedApplicationsController,
  IDENTITY_HTTP_OPTIONS,
  MCP_RESOURCE_PATH,
  OAUTH_HTTP_OPTIONS,
  OAuthConsentController,
  type OAuthHttpOptions,
  OAuthServerController,
  TwoFactorController,
  identityProblemMapper,
} from '@vfortin/identity-adapters-in';
import {
  DrizzleIdentityUnitOfWork,
  DrizzleOAuthUnitOfWork,
  HttpsClientMetadataFetcher,
  type IdentityDatabaseHandle,
  JoseResourceTokenSigner,
  JoseTokenSigner,
  RandomIdGenerator,
  RfcTotpVerifier,
  S256PkceVerifier,
  ScryptPasswordHasher,
  Sha256RefreshTokenCodec,
  type SigningKeys,
  SystemClock,
  loadSigningKeys,
  openIdentityDatabase,
} from '@vfortin/identity-adapters-out';
import {
  ApproveAuthorizationRequest,
  type ClientMetadataFetcher,
  type Clock,
  DenyAuthorizationRequest,
  DisableTwoFactor,
  EnableTwoFactor,
  ExchangeAuthorizationCode,
  GetTwoFactorStatus,
  type IdentityUnitOfWork,
  ListConnectedApplications,
  Login,
  Logout,
  type OAuthServerSettings,
  type OAuthTokenServices,
  type OAuthUnitOfWork,
  RefreshResourceToken,
  RefreshSession,
  RegisterOAuthClient,
  ReviewAuthorizationRequest,
  RevokeConnectedApplication,
  RevokeOAuthToken,
  type SessionServices,
  StartTwoFactorSetup,
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
 * Constant OAUTH_UNIT_OF_WORK
 *
 * @description
 * Private injection token for the transaction-scoped authorization-server repositories.
 *
 * @type {symbol}
 */
const OAUTH_UNIT_OF_WORK: unique symbol = Symbol('OAUTH_UNIT_OF_WORK');

/**
 * Constant OAUTH_TOKEN_SERVICES
 *
 * @description
 * Private injection token for the MCP access-token signer, the opaque-token codec and identifiers.
 *
 * @type {symbol}
 */
const OAUTH_TOKEN_SERVICES: unique symbol = Symbol('OAUTH_TOKEN_SERVICES');

/**
 * Constant OAUTH_SETTINGS
 *
 * @description
 * Private injection token for the issuer and the MCP resource.
 *
 * @type {symbol}
 */
const OAUTH_SETTINGS: unique symbol = Symbol('OAUTH_SETTINGS');

/**
 * Constant CLIENT_METADATA_FETCHER
 *
 * @description
 * Private injection token for the SSRF-safe outbound fetcher of client metadata and logos.
 *
 * @type {symbol}
 */
const CLIENT_METADATA_FETCHER: unique symbol = Symbol('CLIENT_METADATA_FETCHER');

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
   * Property mcpResource
   * @readonly
   *
   * @description
   * Canonical URI of the MCP resource the authorization server issues tokens for (D45); defaults to
   * the issuer's origin followed by `/api/content/mcp`.
   *
   * @type {string | undefined}
   */
  readonly mcpResource?: string;

  /**
   * Property clientMetadataFetcher
   * @readonly
   *
   * @description
   * Optional outbound fetcher override, for tests; defaults to `HttpsClientMetadataFetcher`.
   *
   * @type {ClientMetadataFetcher | undefined}
   */
  readonly clientMetadataFetcher?: ClientMetadataFetcher;

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
 * Composes identity persistence, authentication and second-factor use cases, the OAuth 2.1 authorization server for MCP clients (D45), signing-key publication, the administrator guard of its own routes and HTTP problem mapping into a Nest dynamic module.
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
    const totp: RfcTotpVerifier = new RfcTotpVerifier();
    return {
      module: IdentityModule,
      controllers: [
        AuthController,
        TwoFactorController,
        OAuthServerController,
        OAuthConsentController,
        ConnectedApplicationsController,
      ],
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
          ): VerifyLoginCode => new VerifyLoginCode(unitOfWork, services, totp, clock),
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
          provide: GetTwoFactorStatus,
          inject: [UNIT_OF_WORK],
          useFactory: (unitOfWork: IdentityUnitOfWork): GetTwoFactorStatus =>
            new GetTwoFactorStatus(unitOfWork),
        },
        {
          provide: StartTwoFactorSetup,
          inject: [UNIT_OF_WORK, CLOCK],
          useFactory: (unitOfWork: IdentityUnitOfWork, clock: Clock): StartTwoFactorSetup =>
            new StartTwoFactorSetup(unitOfWork, hasher, totp, clock),
        },
        {
          provide: EnableTwoFactor,
          inject: [UNIT_OF_WORK, CLOCK],
          useFactory: (unitOfWork: IdentityUnitOfWork, clock: Clock): EnableTwoFactor =>
            new EnableTwoFactor(unitOfWork, totp, clock),
        },
        {
          provide: DisableTwoFactor,
          inject: [UNIT_OF_WORK, CLOCK],
          useFactory: (unitOfWork: IdentityUnitOfWork, clock: Clock): DisableTwoFactor =>
            new DisableTwoFactor(unitOfWork, hasher, totp, clock),
        },
        // OAuth 2.1 authorization server for MCP clients (D45).
        {
          provide: OAUTH_UNIT_OF_WORK,
          inject: [IDENTITY_DATABASE],
          useFactory: (database: IdentityDatabaseHandle): DrizzleOAuthUnitOfWork =>
            new DrizzleOAuthUnitOfWork(database.db),
        },
        {
          provide: OAUTH_SETTINGS,
          useValue: {
            issuer: options.issuer,
            resource:
              options.mcpResource ??
              new URL(MCP_RESOURCE_PATH, new URL(options.issuer).origin).href,
          } satisfies OAuthServerSettings,
        },
        {
          provide: OAUTH_TOKEN_SERVICES,
          inject: [SIGNING_KEYS],
          useFactory: (keys: SigningKeys): OAuthTokenServices => ({
            signer: new JoseResourceTokenSigner(keys, options.issuer),
            codec: new Sha256RefreshTokenCodec(),
            ids: new RandomIdGenerator(),
          }),
        },
        {
          provide: CLIENT_METADATA_FETCHER,
          useFactory: (): ClientMetadataFetcher =>
            options.clientMetadataFetcher ?? new HttpsClientMetadataFetcher(),
        },
        {
          provide: ReviewAuthorizationRequest,
          inject: [
            OAUTH_UNIT_OF_WORK,
            CLIENT_METADATA_FETCHER,
            OAUTH_SETTINGS,
            OAUTH_TOKEN_SERVICES,
            CLOCK,
          ],
          useFactory: (
            unitOfWork: OAuthUnitOfWork,
            fetcher: ClientMetadataFetcher,
            settings: OAuthServerSettings,
            services: OAuthTokenServices,
            clock: Clock,
          ): ReviewAuthorizationRequest =>
            new ReviewAuthorizationRequest(unitOfWork, fetcher, settings, services.ids, clock),
        },
        {
          provide: ApproveAuthorizationRequest,
          inject: [OAUTH_UNIT_OF_WORK, OAUTH_SETTINGS, OAUTH_TOKEN_SERVICES, CLOCK],
          useFactory: (
            unitOfWork: OAuthUnitOfWork,
            settings: OAuthServerSettings,
            services: OAuthTokenServices,
            clock: Clock,
          ): ApproveAuthorizationRequest =>
            new ApproveAuthorizationRequest(
              unitOfWork,
              settings,
              services.codec,
              services.ids,
              clock,
            ),
        },
        {
          provide: DenyAuthorizationRequest,
          inject: [OAUTH_UNIT_OF_WORK, OAUTH_SETTINGS, CLOCK],
          useFactory: (
            unitOfWork: OAuthUnitOfWork,
            settings: OAuthServerSettings,
            clock: Clock,
          ): DenyAuthorizationRequest => new DenyAuthorizationRequest(unitOfWork, settings, clock),
        },
        {
          provide: ExchangeAuthorizationCode,
          inject: [OAUTH_UNIT_OF_WORK, OAUTH_TOKEN_SERVICES, CLOCK],
          useFactory: (
            unitOfWork: OAuthUnitOfWork,
            services: OAuthTokenServices,
            clock: Clock,
          ): ExchangeAuthorizationCode =>
            new ExchangeAuthorizationCode(unitOfWork, services, new S256PkceVerifier(), clock),
        },
        {
          provide: RefreshResourceToken,
          inject: [OAUTH_UNIT_OF_WORK, OAUTH_TOKEN_SERVICES, CLOCK],
          useFactory: (
            unitOfWork: OAuthUnitOfWork,
            services: OAuthTokenServices,
            clock: Clock,
          ): RefreshResourceToken => new RefreshResourceToken(unitOfWork, services, clock),
        },
        {
          provide: RevokeOAuthToken,
          inject: [OAUTH_UNIT_OF_WORK, OAUTH_TOKEN_SERVICES, CLOCK],
          useFactory: (
            unitOfWork: OAuthUnitOfWork,
            services: OAuthTokenServices,
            clock: Clock,
          ): RevokeOAuthToken => new RevokeOAuthToken(unitOfWork, services.codec, clock),
        },
        {
          provide: RegisterOAuthClient,
          inject: [OAUTH_UNIT_OF_WORK, OAUTH_TOKEN_SERVICES, CLOCK],
          useFactory: (
            unitOfWork: OAuthUnitOfWork,
            services: OAuthTokenServices,
            clock: Clock,
          ): RegisterOAuthClient => new RegisterOAuthClient(unitOfWork, services.ids, clock),
        },
        {
          provide: ListConnectedApplications,
          inject: [OAUTH_UNIT_OF_WORK],
          useFactory: (unitOfWork: OAuthUnitOfWork): ListConnectedApplications =>
            new ListConnectedApplications(unitOfWork),
        },
        {
          provide: RevokeConnectedApplication,
          inject: [OAUTH_UNIT_OF_WORK, CLOCK],
          useFactory: (unitOfWork: OAuthUnitOfWork, clock: Clock): RevokeConnectedApplication =>
            new RevokeConnectedApplication(unitOfWork, clock),
        },
        {
          provide: OAUTH_HTTP_OPTIONS,
          useValue: { issuer: options.issuer } satisfies OAuthHttpOptions,
        },
        // `@AdminOnly` on the second-factor routes: identity verifies its own access tokens against its
        // public keys, with the checks the other services apply through the published JWKS.
        {
          provide: ADMIN_TOKEN_VERIFIER,
          inject: [SIGNING_KEYS],
          useFactory: (keys: SigningKeys): AdminTokenVerifier =>
            new JoseAdminTokenVerifier({ issuer: options.issuer, jwks: keys.jwks }),
        },
        AdminGuard,
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
