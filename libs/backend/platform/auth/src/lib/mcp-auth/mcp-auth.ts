import {
  type CanActivate,
  type DynamicModule,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Module,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  IDENTITY_ERROR_CODES,
  MCP_SCOPES,
  type McpScopeName,
  type McpTokenClaims,
  McpTokenClaimsSchema,
} from '@vfortin/identity-contracts';
import {
  type JSONWebKeySet,
  type JWTPayload,
  type JWTVerifyGetKey,
  createLocalJWKSet,
  createRemoteJWKSet,
  jwtVerify,
} from 'jose';
import {
  bearerChallenge,
  hasScopes,
  protectedResourceMetadataUrl,
} from '@internal/backend-auth/lib/protected-resource/protected-resource';

/**
 * Interface McpAuthOptions
 * @interface McpAuthOptions
 *
 * @description
 * Configuration of an MCP resource server: the authorization server it trusts and its own identifier.
 */
export interface McpAuthOptions {
  // #region Properties
  /** Exact issuer of the tokens (`AUTH_ISSUER`, e.g. `https://valentin-fortin.pro/api/auth`). */
  readonly issuer: string;
  /** Canonical URI of this resource, the required `aud` (e.g. `https://valentin-fortin.pro/api/content/mcp`). */
  readonly resource: string;
  /** Identity JWKS URL; jose caches the keys for ten minutes. */
  readonly jwksUrl?: string;
  /** In-memory JWKS, for tests; takes precedence over `jwksUrl`. */
  readonly jwks?: JSONWebKeySet;
  // #endregion
}

/**
 * Interface McpPrincipal
 * @interface McpPrincipal
 *
 * @description
 * Who acts through a verified MCP access token: the administrator, on behalf of a client, within
 * scopes. Attached to the request as `request.mcp`.
 */
export interface McpPrincipal {
  // #region Properties
  /** Administrator account (`sub`). */
  readonly subject: string;
  /** Client the token was issued to (`client_id`), for audit logs. */
  readonly clientId: string;
  /** Granted scopes, without the implied ones. */
  readonly scopes: readonly McpScopeName[];
  /** Token identifier (`jti`). */
  readonly tokenId: string;
  // #endregion
}

/**
 * Interface McpTokenVerifier
 * @interface McpTokenVerifier
 *
 * @description
 * Port of the guard: verifies an MCP access token.
 */
export interface McpTokenVerifier {
  // #region Methods
  /**
   * Method verify
   * @method verify
   *
   * @description
   * Verifies a bearer token and resolves its principal; any failure rejects.
   *
   * @param {string} token - Bearer token.
   *
   * @returns {Promise<McpPrincipal>} Trusted principal.
   */
  verify(token: string): Promise<McpPrincipal>;
  // #endregion
}

/**
 * Constant MCP_TOKEN_VERIFIER
 *
 * @description
 * Injection token of the resource server's verifier.
 */
export const MCP_TOKEN_VERIFIER: unique symbol = Symbol('MCP_TOKEN_VERIFIER');

/**
 * Constant MCP_AUTH_OPTIONS
 *
 * @description
 * Injection token of `McpAuthOptions`.
 */
export const MCP_AUTH_OPTIONS: unique symbol = Symbol('MCP_AUTH_OPTIONS');

/**
 * Constant MCP_REQUIRED_SCOPES
 *
 * @description
 * Route metadata key holding the scopes `@McpScope` requires.
 */
export const MCP_REQUIRED_SCOPES = 'portfolio:mcp-required-scopes' as const;

/**
 * Constant MAX_TOKEN_AGE
 *
 * @description
 * Oldest accepted `iat`: the five-minute MCP token lifetime plus one minute, so a token signed with a
 * longer expiry is still refused.
 */
const MAX_TOKEN_AGE = '6m' as const;

/**
 * Constant CLOCK_TOLERANCE_SECONDS
 *
 * @description
 * Clock skew accepted between the identity service and the resource on `exp`, `nbf` and `iat`.
 */
const CLOCK_TOLERANCE_SECONDS = 30 as const;

/**
 * Constant REQUIRED_CLAIMS
 *
 * @description
 * Claims every MCP access token carries (RFC 9068 §2.2), on top of `iss` and `aud` checked by value.
 */
const REQUIRED_CLAIMS: string[] = ['exp', 'iat', 'nbf', 'sub', 'jti', 'client_id', 'scope'];

/**
 * Constant BEARER
 *
 * @description
 * Extracts the credential of a case-insensitive Bearer authorization header.
 */
const BEARER: RegExp = /^Bearer +(\S+)$/i;

/**
 * Function isMcpScope
 *
 * @description
 * Narrows a scope token to an MCP scope.
 *
 * @param {string} value - Scope token.
 *
 * @returns {boolean} Whether it is one of `MCP_SCOPES`.
 */
function isMcpScope(value: string): value is McpScopeName {
  return (MCP_SCOPES as readonly string[]).includes(value);
}

/**
 * Class JoseMcpTokenVerifier
 * @class JoseMcpTokenVerifier
 * @implements McpTokenVerifier
 *
 * @description
 * Verifies MCP access tokens (D45) with jose against the identity JWKS: EdDSA only, `typ: at+jwt`,
 * the exact issuer, an audience that is this resource and nothing else (RFC 8707: a token for another
 * resource is never accepted, so none can be passed through), the RFC 9068 claims, an age within six
 * minutes and 30 seconds of skew, and known scopes only. An administrator session token is refused
 * twice: its audience is `portfolio-admin` and it carries `sid` and `role`.
 */
export class JoseMcpTokenVerifier implements McpTokenVerifier {
  // #region Properties
  /** Local or remote JWKS resolver. */
  private readonly keys: JWTVerifyGetKey;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Selects the key source.
   *
   * @param {McpAuthOptions} options - Issuer, resource and keys.
   *
   * @throws {Error} When neither `jwks` nor `jwksUrl` is given.
   */
  public constructor(private readonly options: McpAuthOptions) {
    if (options.jwks) {
      this.keys = createLocalJWKSet(options.jwks);
    } else if (options.jwksUrl) {
      this.keys = createRemoteJWKSet(new URL(options.jwksUrl), {
        cacheMaxAge: 10 * 60 * 1000,
        cooldownDuration: 30 * 1000,
      });
    } else {
      throw new Error('McpAuthModule: jwksUrl or jwks is required.');
    }
  }
  // #endregion

  // #region Methods
  /**
   * Method verify
   * @method verify
   *
   * @description
   * Verifies the signature and claims, then resolves the principal.
   *
   * @param {string} token - Bearer token.
   *
   * @returns {Promise<McpPrincipal>} Principal; rejects on any failure.
   */
  public async verify(token: string): Promise<McpPrincipal> {
    const { payload }: { payload: JWTPayload } = await jwtVerify(token, this.keys, {
      issuer: this.options.issuer,
      audience: this.options.resource,
      algorithms: ['EdDSA'],
      typ: 'at+jwt',
      requiredClaims: REQUIRED_CLAIMS,
      maxTokenAge: MAX_TOKEN_AGE,
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    });
    const audience: unknown = payload.aud;
    if (!(
      audience === this.options.resource ||
      (Array.isArray(audience) && audience.length === 1 && audience[0] === this.options.resource)
    )) {
      throw new Error('The token is not restricted to this resource.');
    }
    if (payload['sid'] !== undefined || payload['role'] !== undefined) {
      throw new Error('Administrator session tokens are not accepted here.');
    }
    const claims: McpTokenClaims = McpTokenClaimsSchema.parse(payload);
    const scopes: string[] = claims.scope.split(' ');
    if (!scopes.every((scope: string): boolean => isMcpScope(scope))) {
      throw new Error('The token carries an unknown scope.');
    }
    return {
      subject: claims.sub,
      clientId: claims.client_id,
      scopes: scopes.filter((scope: string): scope is McpScopeName => isMcpScope(scope)),
      tokenId: claims.jti,
    };
  }
  // #endregion
}

/**
 * Interface McpRequest
 * @interface McpRequest
 *
 * @description
 * Shape of the request the guard reads and decorates.
 */
interface McpRequest {
  // #region Properties
  readonly headers: Record<string, string | string[] | undefined>;
  mcp?: McpPrincipal;
  // #endregion
}

/**
 * Interface ChallengeResponse
 * @interface ChallengeResponse
 *
 * @description
 * Response surface the guard writes its challenge on.
 */
interface ChallengeResponse {
  // #region Methods
  setHeader(name: string, value: string): unknown;
  // #endregion
}

/**
 * Class McpTokenGuard
 * @class McpTokenGuard
 *
 * @description
 * Guard of the MCP endpoint (D45). Without a usable token it answers 401 with
 * `WWW-Authenticate: Bearer resource_metadata="…", scope="…"` (plus `error="invalid_token"` when a
 * token was sent), so that clients discover the authorization server; with a valid token lacking a
 * required scope it answers 403 `insufficient_scope` with every scope the operation needs, for a
 * step-up. Otherwise it attaches the principal as `request.mcp`.
 */
@Injectable()
export class McpTokenGuard implements CanActivate {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the verifier, the options and the route metadata reader.
   *
   * @param {McpTokenVerifier} verifier - Token verifier.
   * @param {McpAuthOptions} options - Resource identity.
   * @param {Reflector} reflector - Reads `@McpScope` requirements.
   */
  public constructor(
    @Inject(MCP_TOKEN_VERIFIER) private readonly verifier: McpTokenVerifier,
    @Inject(MCP_AUTH_OPTIONS) private readonly options: McpAuthOptions,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method canActivate
   * @method canActivate
   *
   * @description
   * Verifies the bearer token and the route's scopes.
   *
   * @param {ExecutionContext} context - Request context.
   *
   * @returns {Promise<boolean>} `true` once the principal is attached.
   *
   * @throws {UnauthorizedException} Without a valid token (`auth.unauthorized`).
   * @throws {ForbiddenException} When a scope is missing (`auth.insufficient-scope`).
   */
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const required: readonly McpScopeName[] =
      this.reflector.getAllAndOverride<McpScopeName[] | undefined>(MCP_REQUIRED_SCOPES, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const http: ReturnType<ExecutionContext['switchToHttp']> = context.switchToHttp();
    const request: McpRequest = http.getRequest<McpRequest>();
    const response: ChallengeResponse = http.getResponse<ChallengeResponse>();
    const resourceMetadataUrl: string = protectedResourceMetadataUrl(this.options.resource);
    const challengeScope: readonly string[] = required.length > 0 ? required : MCP_SCOPES;
    const header: string | string[] | undefined = request.headers['authorization'];
    const token: string | undefined = BEARER.exec(typeof header === 'string' ? header : '')?.[1];
    if (token === undefined) {
      response.setHeader(
        'WWW-Authenticate',
        bearerChallenge({ resourceMetadataUrl, scope: challengeScope }),
      );
      throw new UnauthorizedException({
        code: IDENTITY_ERROR_CODES.unauthorized,
        message: 'An MCP access token is required.',
      });
    }
    let principal: McpPrincipal;
    try {
      principal = await this.verifier.verify(token);
    } catch {
      response.setHeader(
        'WWW-Authenticate',
        bearerChallenge({
          resourceMetadataUrl,
          scope: challengeScope,
          error: 'invalid_token',
          errorDescription: 'The access token is invalid, expired or not issued for this resource.',
        }),
      );
      throw new UnauthorizedException({
        code: IDENTITY_ERROR_CODES.unauthorized,
        message: 'The access token is invalid.',
      });
    }
    if (!hasScopes(principal.scopes, required)) {
      response.setHeader(
        'WWW-Authenticate',
        bearerChallenge({
          resourceMetadataUrl,
          scope: required,
          error: 'insufficient_scope',
          errorDescription: `This operation requires ${required.join(' ')}.`,
        }),
      );
      throw new ForbiddenException({
        code: IDENTITY_ERROR_CODES.insufficientScope,
        message: 'The access token lacks a required scope.',
      });
    }
    request.mcp = principal;
    return true;
  }
  // #endregion
}

/**
 * Function McpScope
 *
 * @description
 * Protects an MCP route (or a controller) with `McpTokenGuard` and declares the scopes it needs;
 * `@McpScope()` alone requires a valid token without a particular scope. For a single MCP endpoint
 * whose tools need different scopes, guard it with `@McpScope()` and check each tool with
 * `hasScopes(mcpPrincipalOf(request).scopes, [...])`, answering `insufficient_scope` the same way.
 *
 * @param {...McpScopeName[]} scopes - Required scopes.
 *
 * @returns {MethodDecorator & ClassDecorator} Nest decorator.
 */
export const McpScope = (...scopes: McpScopeName[]): MethodDecorator & ClassDecorator =>
  applyDecorators(SetMetadata(MCP_REQUIRED_SCOPES, scopes), UseGuards(McpTokenGuard));

/**
 * Function mcpPrincipalOf
 *
 * @description
 * Reads the principal `McpTokenGuard` attached to a request.
 *
 * @param {object} request - Guarded request.
 *
 * @returns {McpPrincipal} Principal.
 *
 * @throws {UnauthorizedException} When the guard did not run.
 */
export function mcpPrincipalOf(request: object): McpPrincipal {
  const principal: McpPrincipal | undefined = (request as { mcp?: McpPrincipal }).mcp;
  if (principal === undefined) {
    throw new UnauthorizedException({
      code: IDENTITY_ERROR_CODES.unauthorized,
      message: 'An MCP access token is required.',
    });
  }
  return principal;
}

/**
 * Class McpAuthModule
 * @class McpAuthModule
 *
 * @description
 * Registers the MCP verifier and guard of a resource server (D45), separate from `AdminAuthModule`:
 * a service may import both, and each guard accepts only its own tokens.
 */
@Module({})
export class McpAuthModule {
  // #region Methods
  /**
   * Method forRoot
   * @method forRoot
   * @static
   *
   * @description
   * Creates the global module.
   *
   * @param {McpAuthOptions} options - Issuer, resource and keys.
   *
   * @returns {DynamicModule} Providers and exports.
   */
  public static forRoot(options: McpAuthOptions): DynamicModule {
    return {
      module: McpAuthModule,
      global: true,
      providers: [
        { provide: MCP_AUTH_OPTIONS, useValue: options },
        {
          provide: MCP_TOKEN_VERIFIER,
          useFactory: (): JoseMcpTokenVerifier => new JoseMcpTokenVerifier(options),
        },
        McpTokenGuard,
      ],
      exports: [MCP_AUTH_OPTIONS, MCP_TOKEN_VERIFIER, McpTokenGuard],
    };
  }
  // #endregion
}
