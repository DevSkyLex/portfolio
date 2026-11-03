import {
  type CanActivate,
  type DynamicModule,
  type ExecutionContext,
  Inject,
  Injectable,
  Module,
  UnauthorizedException,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import {
  ADMIN_AUDIENCE,
  type AdminClaims,
  AdminClaimsSchema,
  IDENTITY_ERROR_CODES,
} from '@vfortin/identity-contracts';
import {
  type JSONWebKeySet,
  type JWTVerifyGetKey,
  createLocalJWKSet,
  createRemoteJWKSet,
  jwtVerify,
} from 'jose';

/**
 * Interface AdminAuthOptions
 * @interface AdminAuthOptions
 *
 * @description
 * Supplies the issuer and public verification-key source used by a service's administrator guard.
 */
export interface AdminAuthOptions {
  // #region Properties
  /**
   * Property issuer
   * @readonly
   *
   * @description
   * Exact issuer claim expected on every administrator access token.
   *
   * @type {string}
   */
  readonly issuer: string;

  /**
   * Property jwksUrl
   * @readonly
   *
   * @description
   * Optional identity-service JWKS URL; jose caches remote keys for ten minutes.
   *
   * @type {string | undefined}
   */
  readonly jwksUrl?: string;

  /**
   * Property jwks
   * @readonly
   *
   * @description
   * Optional in-memory JWKS, primarily used to configure deterministic local verification.
   *
   * @type {JSONWebKeySet | undefined}
   */
  readonly jwks?: JSONWebKeySet;
  // #endregion
}

/**
 * Interface AdminTokenVerifier
 * @interface AdminTokenVerifier
 *
 * @description
 * Port used by the request guard to validate administrator access tokens and obtain trusted claims.
 */
export interface AdminTokenVerifier {
  // #region Methods
  /**
   * Method verify
   * @method verify
   *
   * @description
   * Verifies a signed access token and resolves its administrator claims; verification failures reject the promise.
   *
   * @param {string} token - Encoded bearer token extracted from the request.
   * @returns {Promise<AdminClaims>} Validated subject, administrator role and session.
   */
  verify(token: string): Promise<AdminClaims>;
  // #endregion
}

/**
 * Constant ADMIN_TOKEN_VERIFIER
 *
 * @description
 * Nest injection token for the service-scoped administrator token verifier.
 */
export const ADMIN_TOKEN_VERIFIER: unique symbol = Symbol('ADMIN_TOKEN_VERIFIER');

/**
 * Constant ACCESS_TOKEN_TYPE
 *
 * @description
 * Required `typ` header (RFC 9068): another JWT signed with the identity keys is not an access token.
 */
const ACCESS_TOKEN_TYPE = 'at+jwt' as const;

/**
 * Constant MAX_TOKEN_AGE
 *
 * @description
 * Maximum accepted age of an access token's issued-at claim: the five-minute token lifetime plus one
 * minute, so a token signed with a longer expiry is still refused.
 */
const MAX_TOKEN_AGE = '6m' as const;

/**
 * Constant CLOCK_TOLERANCE_SECONDS
 *
 * @description
 * Clock skew accepted between the identity service and the verifying service on `exp`, `nbf` and `iat`.
 */
const CLOCK_TOLERANCE_SECONDS = 30 as const;

/**
 * Constant REQUIRED_CLAIMS
 *
 * @description
 * Claims every access token must carry, on top of `iss` and `aud` checked by value.
 */
const REQUIRED_CLAIMS: string[] = ['exp', 'iat', 'nbf', 'sub', 'jti', 'sid'];

/**
 * Constant BEARER
 *
 * @description
 * Extracts a non-whitespace credential from a case-insensitive Bearer authorization header.
 */
const BEARER: RegExp = /^Bearer +(\S+)$/i;

/**
 * Class JoseAdminTokenVerifier
 * @class JoseAdminTokenVerifier
 *
 * @description
 * Verifies administrator JWTs with jose, enforcing EdDSA, the `at+jwt` type, issuer, audience, required claims (session `sid` included), age and the admin claim schema.
 */
export class JoseAdminTokenVerifier implements AdminTokenVerifier {
  // #region Properties
  /**
   * Property keys
   * @readonly
   *
   * @description
   * Local or remotely cached JWKS resolver selected during construction.
   *
   * @type {JWTVerifyGetKey}
   */
  private readonly keys: JWTVerifyGetKey;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates a local key resolver or a cached remote JWKS resolver; construction fails when neither source is configured.
   *
   * @param {AdminAuthOptions} options - Issuer and at least one key source; when both are set, the local JWKS takes precedence.
   * @throws {Error} When neither `jwks` nor `jwksUrl` is provided.
   */
  public constructor(private readonly options: AdminAuthOptions) {
    if (options.jwks) {
      this.keys = createLocalJWKSet(options.jwks);
    } else if (options.jwksUrl) {
      this.keys = createRemoteJWKSet(new URL(options.jwksUrl), {
        cacheMaxAge: 10 * 60 * 1000,
        cooldownDuration: 30 * 1000,
      });
    } else {
      throw new Error('AdminAuthModule: jwksUrl or jwks is required.');
    }
  }
  // #endregion

  // #region Methods
  /**
   * Method verify
   * @method verify
   *
   * @description
   * Validates the JWT signature and standard claims, then parses its payload as administrator claims.
   * Invalid signatures, claims, age or payload reject the returned promise.
   *
   * @param {string} token - Encoded access token to verify.
   * @returns {Promise<AdminClaims>} Trusted subject, administrator role and session.
   */
  public async verify(token: string): Promise<AdminClaims> {
    const { payload } = await jwtVerify(token, this.keys, {
      issuer: this.options.issuer,
      audience: ADMIN_AUDIENCE,
      algorithms: ['EdDSA'],
      typ: ACCESS_TOKEN_TYPE,
      requiredClaims: REQUIRED_CLAIMS,
      // Access tokens live 5 minutes: an older `iat` means a token signed with a long expiry.
      maxTokenAge: MAX_TOKEN_AGE,
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    });
    return AdminClaimsSchema.parse(payload);
  }
  // #endregion
}

/**
 * Function unauthorized
 *
 * @description
 * Creates the uniform unauthorized response used when a bearer token is absent or invalid.
 *
 * @returns {UnauthorizedException} HTTP 401 exception with the shared identity error code.
 */
function unauthorized(): UnauthorizedException {
  return new UnauthorizedException({
    code: IDENTITY_ERROR_CODES.unauthorized,
    message: 'Administrator authentication required.',
  });
}

/**
 * Class AdminGuard
 * @class AdminGuard
 *
 * @description
 * Requires a bearer token accepted by the configured verifier and attaches its claims to the HTTP request.
 * Missing or rejected tokens produce the same unauthorized response.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the verifier registered by `AdminAuthModule.forRoot`.
   *
   * @param {AdminTokenVerifier} verifier - Token verification implementation for this service.
   */
  public constructor(@Inject(ADMIN_TOKEN_VERIFIER) private readonly verifier: AdminTokenVerifier) {}
  // #endregion

  // #region Methods
  /**
   * Method canActivate
   * @method canActivate
   *
   * @description
   * Reads a case-insensitive Bearer authorization scheme, verifies the token and stores its claims on the request.
   * All verification failures are normalized to HTTP 401.
   *
   * @param {ExecutionContext} context - Nest context for the incoming HTTP request.
   * @returns {Promise<boolean>} Resolves `true` only after trusted admin claims are attached.
   */
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: { headers: Record<string, string | undefined>; admin?: AdminClaims } = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined>; admin?: AdminClaims }>();
    const token: string | undefined = BEARER.exec(request.headers['authorization'] ?? '')?.[1];
    if (token === undefined) {
      throw unauthorized();
    }
    try {
      request.admin = await this.verifier.verify(token);
      return true;
    } catch {
      throw unauthorized();
    }
  }
  // #endregion
}

/**
 * Function AdminOnly
 *
 * @description
 * Applies the administrator guard to one route handler or an entire controller.
 *
 * @returns {MethodDecorator & ClassDecorator} Nest decorator applying `AdminGuard`.
 */
export const AdminOnly = (): MethodDecorator & ClassDecorator =>
  applyDecorators(UseGuards(AdminGuard));

/**
 * Class AdminAuthModule
 * @class AdminAuthModule
 *
 * @description
 * Registers the service-wide verifier and guard using the supplied identity issuer and JWKS source.
 */
@Module({})
export class AdminAuthModule {
  // #region Methods
  /**
   * Method forRoot
   * @method forRoot
   * @static
   *
   * @description
   * Creates a global Nest module whose verifier is configured from the identity service's issuer and signing keys.
   *
   * @param {AdminAuthOptions} options - Issuer plus local JWKS or remote JWKS URL.
   * @returns {DynamicModule} Global providers and exports for authorization.
   */
  public static forRoot(options: AdminAuthOptions): DynamicModule {
    return {
      module: AdminAuthModule,
      global: true,
      providers: [
        {
          provide: ADMIN_TOKEN_VERIFIER,
          useFactory: (): JoseAdminTokenVerifier => new JoseAdminTokenVerifier(options),
        },
        AdminGuard,
      ],
      exports: [ADMIN_TOKEN_VERIFIER, AdminGuard],
    };
  }
  // #endregion
}
