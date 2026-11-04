import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Options,
  Post,
  UseFilters,
} from '@nestjs/common';
import {
  ExchangeAuthorizationCode,
  type IssuedTokens,
  RefreshResourceToken,
  RegisterOAuthClient,
  RevokeOAuthToken,
} from '@vfortin/identity-application';
import {
  type AuthorizationServerMetadata,
  type ClientRegistrationResponse,
  type RevocationRequest,
  RevocationRequestSchema,
  type TokenRequest,
  TokenRequestSchema,
  type TokenResponse,
} from '@vfortin/identity-contracts';
import { type OAuthClient, OAuthError, formatScopes } from '@vfortin/identity-domain';
import { OAuthErrorFilter } from '@internal/identity-adapters-in/lib/http/filters/oauth-error/oauth-error.filter';
import {
  optionalParameter,
  requiredParameter,
} from '@internal/identity-adapters-in/lib/http/mappers/oauth-parameters/oauth-parameters.mapper';
import { authorizationServerMetadata } from '@internal/identity-adapters-in/lib/http/presenters/authorization-server-metadata/authorization-server-metadata.presenter';

/**
 * Interface OAuthHttpOptions
 * @interface OAuthHttpOptions
 *
 * @description
 * Settings of the protocol endpoints supplied by composition.
 */
export interface OAuthHttpOptions {
  // #region Properties
  /**
   * Property issuer
   * @readonly
   *
   * @description
   * Issuer identifier (`IDENTITY_ISSUER`), from which the metadata derives every endpoint.
   *
   * @type {string}
   */
  readonly issuer: string;
  // #endregion
}

/**
 * Constant OAUTH_HTTP_OPTIONS
 *
 * @description
 * Injection token of `OAuthHttpOptions`.
 *
 * @type {symbol}
 */
export const OAUTH_HTTP_OPTIONS: unique symbol = Symbol('OAUTH_HTTP_OPTIONS');

/**
 * Function parse
 *
 * @description
 * Validates a protocol body with its contract, answering `invalid_request` rather than problem+json.
 *
 * @template T - Parsed type.
 * @param {{ safeParse: (value: unknown) => { success: boolean; data?: T } }} schema - Contract schema.
 * @param {unknown} body - Parsed request body (form or JSON).
 *
 * @returns {T} Parsed body.
 *
 * @throws {OAuthError} `invalid_request` for a malformed body.
 */
function parse<T>(
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
  body: unknown,
): T {
  const result: { success: true; data: T } | { success: false } = schema.safeParse(body ?? {});
  if (!result.success) {
    throw new OAuthError('invalid_request', 'The request parameters are malformed.');
  }
  return result.data;
}

/**
 * Function toTokenResponse
 *
 * @description
 * Maps issued credentials to the RFC 6749 §5.1 response.
 *
 * @param {IssuedTokens} tokens - Issued credentials.
 *
 * @returns {TokenResponse} Response body.
 */
function toTokenResponse(tokens: IssuedTokens): TokenResponse {
  return {
    access_token: tokens.accessToken,
    token_type: 'Bearer',
    expires_in: tokens.expiresIn,
    refresh_token: tokens.refreshToken,
    scope: formatScopes(tokens.scopes),
  };
}

/**
 * Class OAuthServerController
 * @class OAuthServerController
 *
 * @description
 * Protocol endpoints of the OAuth 2.1 authorization server for MCP clients (D45): RFC 8414 metadata,
 * the token endpoint (authorization code with PKCE, rotating refresh), RFC 7009 revocation and
 * RFC 7591 registration. They authenticate no cookie (public clients identified by `client_id` and
 * PKCE), so they answer cross-origin requests with `Access-Control-Allow-Origin: *` for browser-based
 * clients; failures use the OAuth error format (`OAuthErrorFilter`), and every token answer is
 * `no-store`. Nginx rate-limits each of them (`docker/nginx/snippets/site.conf`).
 */
@Controller('auth')
@UseFilters(OAuthErrorFilter)
export class OAuthServerController {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects the protocol use cases and settings.
   *
   * @param {ExchangeAuthorizationCode} exchangeUseCase - Code redemption.
   * @param {RefreshResourceToken} refreshUseCase - Refresh rotation.
   * @param {RevokeOAuthToken} revokeUseCase - Token revocation.
   * @param {RegisterOAuthClient} registerUseCase - Dynamic registration.
   * @param {OAuthHttpOptions} options - Issuer.
   */
  public constructor(
    @Inject(ExchangeAuthorizationCode) private readonly exchangeUseCase: ExchangeAuthorizationCode,
    @Inject(RefreshResourceToken) private readonly refreshUseCase: RefreshResourceToken,
    @Inject(RevokeOAuthToken) private readonly revokeUseCase: RevokeOAuthToken,
    @Inject(RegisterOAuthClient) private readonly registerUseCase: RegisterOAuthClient,
    @Inject(OAUTH_HTTP_OPTIONS) private readonly options: OAuthHttpOptions,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method metadata
   * @method metadata
   *
   * @description
   * Authorization server metadata (RFC 8414). Served here in the path-appending form; Nginx maps the
   * path-insertion URL `/.well-known/oauth-authorization-server/api/auth` that MCP clients try first.
   *
   * @returns {AuthorizationServerMetadata} Metadata document.
   */
  @Get('.well-known/oauth-authorization-server')
  @Header('Cache-Control', 'public, max-age=3600')
  @Header('Access-Control-Allow-Origin', '*')
  public metadata(): AuthorizationServerMetadata {
    return authorizationServerMetadata(this.options.issuer);
  }

  /**
   * Method preflight
   * @method preflight
   *
   * @description
   * CORS preflight of the protocol endpoints: any origin, no credentials, the headers MCP clients
   * send (`MCP-Protocol-Version` on discovery).
   *
   * @returns {void} Empty 204 answer.
   */
  @Options([
    '.well-known/oauth-authorization-server',
    'oauth/token',
    'oauth/revoke',
    'oauth/register',
  ])
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  @Header('Access-Control-Allow-Headers', 'Authorization, Content-Type, MCP-Protocol-Version')
  @Header('Access-Control-Max-Age', '600')
  public preflight(): void {
    return;
  }

  /**
   * Method token
   * @method token
   *
   * @description
   * Token endpoint (OAuth 2.1 §3.2), form-encoded: `authorization_code` with `code`,
   * `code_verifier`, `client_id`, `redirect_uri` and optionally `resource`; `refresh_token` with
   * `refresh_token`, `client_id` and optionally a narrower `scope` and `resource`.
   *
   * @param {unknown} body - Parsed form.
   *
   * @returns {Promise<TokenResponse>} Bearer access token, lifetime, rotated refresh token, scopes.
   */
  @Post('oauth/token')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @Header('Access-Control-Allow-Origin', '*')
  public async token(@Body() body: unknown): Promise<TokenResponse> {
    const request: TokenRequest = parse(TokenRequestSchema, body);
    const grantType: string = requiredParameter(request.grant_type, 'grant_type');
    if (grantType === 'authorization_code') {
      return toTokenResponse(
        await this.exchangeUseCase.execute({
          code: requiredParameter(request.code, 'code'),
          codeVerifier: requiredParameter(request.code_verifier, 'code_verifier'),
          clientId: requiredParameter(request.client_id, 'client_id'),
          redirectUri: requiredParameter(request.redirect_uri, 'redirect_uri'),
          resource: optionalParameter(request.resource, 'resource'),
        }),
      );
    }
    if (grantType === 'refresh_token') {
      return toTokenResponse(
        await this.refreshUseCase.execute({
          refreshToken: requiredParameter(request.refresh_token, 'refresh_token'),
          clientId: requiredParameter(request.client_id, 'client_id'),
          scope: optionalParameter(request.scope, 'scope'),
          resource: optionalParameter(request.resource, 'resource'),
        }),
      );
    }
    throw new OAuthError(
      'unsupported_grant_type',
      'Only authorization_code and refresh_token are supported.',
    );
  }

  /**
   * Method revoke
   * @method revoke
   *
   * @description
   * Revocation endpoint (RFC 7009): revokes the family of a refresh token; an unknown token, or an
   * access token, still answers 200.
   *
   * @param {unknown} body - Parsed form.
   *
   * @returns {Promise<void>} Empty 200 answer.
   */
  @Post('oauth/revoke')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Header('Access-Control-Allow-Origin', '*')
  public async revoke(@Body() body: unknown): Promise<void> {
    const request: RevocationRequest = parse(RevocationRequestSchema, body);
    optionalParameter(request.token_type_hint, 'token_type_hint');
    await this.revokeUseCase.execute({
      token: requiredParameter(request.token, 'token'),
      clientId: optionalParameter(request.client_id, 'client_id'),
    });
  }

  /**
   * Method register
   * @method register
   *
   * @description
   * Dynamic Client Registration (RFC 7591, kept for older MCP clients): a JSON body of client
   * metadata; public clients with `https` or loopback redirect URIs only.
   *
   * @param {unknown} body - Parsed JSON.
   *
   * @returns {Promise<ClientRegistrationResponse>} Registered client information.
   */
  @Post('oauth/register')
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  @Header('Access-Control-Allow-Origin', '*')
  public async register(@Body() body: unknown): Promise<ClientRegistrationResponse> {
    const client: OAuthClient = await this.registerUseCase.execute(body ?? {});
    return {
      client_id: client.id,
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      ...(client.name === null ? {} : { client_name: client.name }),
      ...(client.clientUri === null ? {} : { client_uri: client.clientUri }),
      ...(client.logoUri === null ? {} : { logo_uri: client.logoUri }),
      redirect_uris: [...client.redirectUris],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    };
  }
  // #endregion
}
