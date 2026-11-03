import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ZodValidationPipe } from '@vfortin/backend-http';
import {
  ChallengeExpiredError,
  InvalidCredentialsError,
  InvalidSessionError,
  type IssuedDevice,
  Login,
  Logout,
  RefreshSession,
  type Session,
  VerifyLoginCode,
  type LoginResult,
} from '@vfortin/identity-application';
import {
  CSRF_HEADER,
  DEVICE_COOKIE,
  type LoginRequest,
  LoginRequestSchema,
  type LoginResponse,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  SECURE_COOKIE_PREFIX,
  type SessionResponse,
  type TotpRequest,
  TotpRequestSchema,
} from '@vfortin/identity-contracts';
import { AccountLockedError } from '@vfortin/identity-domain';
import type { CookieOptions, Request, Response } from 'express';

/**
 * Interface IdentityHttpOptions
 * @interface IdentityHttpOptions
 *
 * @description
 * Runtime HTTP settings consumed by the identity controller.
 */
export interface IdentityHttpOptions {
  // #region Properties
  /**
   * Property cookieSecure
   * @readonly
   *
   * @description
   * Enables `__Host-` cookies (`Secure`, `Path=/`); false is reserved for local development without
   * TLS, where the cookies keep their plain names and `Path=/api/auth`.
   *
   * @type {boolean}
   */
  readonly cookieSecure: boolean;

  /**
   * Property jwks
   * @readonly
   *
   * @description
   * Public signing-key set exposed by the JWKS endpoint.
   *
   * @type {{ readonly keys: readonly unknown[] }}
   */
  readonly jwks: { readonly keys: readonly unknown[] };
  // #endregion
}

/**
 * Constant IDENTITY_HTTP_OPTIONS
 *
 * @description
 * Injection token for the HTTP cookie and public-key settings supplied by composition.
 *
 * @type {symbol}
 */
export const IDENTITY_HTTP_OPTIONS: unique symbol = Symbol('IDENTITY_HTTP_OPTIONS');

/**
 * Interface IdentityCookie
 * @interface IdentityCookie
 *
 * @description
 * Name and path under which an identity cookie is set, read and cleared.
 */
export interface IdentityCookie {
  // #region Properties
  /**
   * Property name
   * @readonly
   *
   * @description
   * Cookie name, prefixed with `__Host-` over HTTPS.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property path
   * @readonly
   *
   * @description
   * Cookie path: `/` as the `__Host-` prefix requires, otherwise the identity API only.
   *
   * @type {string}
   */
  readonly path: string;
  // #endregion
}

/**
 * Function identityCookie
 *
 * @description
 * Decides the name and path of an identity cookie. Over HTTPS the `__Host-` prefix makes the browser
 * refuse the cookie unless it is `Secure`, on `Path=/` and without `Domain`, so a subdomain or plain
 * HTTP cannot plant or shadow it; in HTTP development the plain name stays on `/api/auth`.
 *
 * @param {string} base - Contract cookie name (`REFRESH_COOKIE`, `DEVICE_COOKIE`).
 * @param {boolean} secure - Whether the cookies are `Secure`.
 *
 * @returns {IdentityCookie} Name and path to use.
 */
export function identityCookie(base: string, secure: boolean): IdentityCookie {
  return secure
    ? { name: `${SECURE_COOKIE_PREFIX}${base}`, path: '/' }
    : { name: base, path: REFRESH_COOKIE_PATH };
}

/**
 * Function readCookie
 *
 * @description
 * Extracts and decodes one named cookie from the raw request header without requiring cookie-parser. Malformed URI escapes are treated as an absent cookie.
 *
 * @param {string | undefined} header - Raw `Cookie` header value.
 * @param {string} name - Cookie name to locate.
 *
 * @returns {string | null} Decoded cookie value when found, or `null` when absent or malformed.
 */
export function readCookie(header: string | undefined, name: string): string | null {
  for (const part of (header ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) {
      try {
        return decodeURIComponent(value.join('='));
      } catch {
        // Malformed escape sequence: treated as an absent cookie, not as a server error.
        return null;
      }
    }
  }
  return null;
}

/**
 * Class AuthController
 * @class AuthController
 *
 * @description
 * Maps identity use cases to authentication HTTP routes, manages the refresh and trusted-device cookies and applies the anti-CSRF check to the second login step, refresh and logout.
 */
@Controller('auth')
export class AuthController {
  // #region Properties
  /**
   * Property logger
   * @readonly
   *
   * @description
   * Nest logger used to record authentication refusals without logging credentials.
   *
   * @type {Logger}
   */
  private readonly logger: Logger = new Logger(AuthController.name);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects the application use cases and HTTP settings used by the route handlers.
   *
   * @param {Login} loginUseCase - Password step of the login.
   * @param {VerifyLoginCode} verifyCodeUseCase - One-time-code step of the login.
   * @param {RefreshSession} refreshUseCase - Refresh-token exchange use case.
   * @param {Logout} logoutUseCase - Session-family revocation use case.
   * @param {IdentityHttpOptions} options - Cookie security and public signing-key settings.
   */
  public constructor(
    @Inject(Login) private readonly loginUseCase: Login,
    @Inject(VerifyLoginCode) private readonly verifyCodeUseCase: VerifyLoginCode,
    @Inject(RefreshSession) private readonly refreshUseCase: RefreshSession,
    @Inject(Logout) private readonly logoutUseCase: Logout,
    @Inject(IDENTITY_HTTP_OPTIONS) private readonly options: IdentityHttpOptions,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method login
   * @method login
   *
   * @description
   * First login step. Checks the password with the trusted-device cookie the browser holds: on a device trusted by the account the session opens at once (refresh cookie set), otherwise a one-time-code challenge is returned. Refusals are logged without credential values and rethrown for problem mapping.
   *
   * @param {LoginRequest} body - Validated login request.
   * @param {Request} request - Express request carrying the device cookie.
   * @param {Response} response - Express response used to set the refresh cookie.
   *
   * @returns {Promise<LoginResponse>} Open session or challenge.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  public async login(
    @Body(new ZodValidationPipe(LoginRequestSchema)) body: LoginRequest,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    try {
      const result: LoginResult = await this.loginUseCase.execute({
        email: body.email,
        password: body.password,
        remember: body.remember,
        deviceToken: readCookie(request.headers.cookie, this.deviceCookie().name),
      });
      if (result.status === 'totp-required') {
        return {
          status: 'totp-required',
          challenge: result.challenge,
          expiresIn: result.expiresIn,
        };
      }
      return { status: 'authenticated', ...this.open(response, result.session) };
    } catch (error: unknown) {
      this.logRefusal('Login refused', error);
      throw error;
    }
  }

  /**
   * Method verifyCode
   * @method verifyCode
   *
   * @description
   * Second login step. Requires the anti-CSRF header, exchanges the challenge and the one-time code for a session (refresh cookie set) and, when asked, sets the trusted-device cookie until the device expiry.
   *
   * @param {TotpRequest} body - Validated second-step request.
   * @param {Request} request - Express request containing the anti-CSRF header.
   * @param {Response} response - Express response used to set the cookies.
   *
   * @returns {Promise<SessionResponse>} Access token and validity duration.
   */
  @Post('login/totp')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  public async verifyCode(
    @Body(new ZodValidationPipe(TotpRequestSchema)) body: TotpRequest,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    this.assertCsrf(request);
    try {
      const { session, device } = await this.verifyCodeUseCase.execute(body);
      if (device !== null) {
        this.trust(response, device);
      }
      return this.open(response, session);
    } catch (error: unknown) {
      this.logRefusal('Login code refused', error);
      throw error;
    }
  }

  /**
   * Method refresh
   * @method refresh
   *
   * @description
   * Requires the anti-CSRF header, exchanges the refresh cookie, and clears that cookie when the session is invalid.
   *
   * @param {Request} request - Express request containing the cookie and anti-CSRF header.
   * @param {Response} response - Express response used to rotate or clear the refresh cookie.
   *
   * @returns {Promise<SessionResponse>} New access token and validity duration.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  public async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    this.assertCsrf(request);
    const token: string | null = readCookie(request.headers.cookie, this.refreshCookie().name);
    if (token === null) {
      throw new InvalidSessionError();
    }
    try {
      return this.open(response, await this.refreshUseCase.execute(token));
    } catch (error: unknown) {
      if (error instanceof InvalidSessionError) {
        this.clear(response);
      }
      throw error;
    }
  }

  /**
   * Method logout
   * @method logout
   *
   * @description
   * Requires the anti-CSRF header, revokes the session family when a refresh cookie is present, and clears the refresh cookie after revocation completes. The trusted-device cookie and its device stay: trust belongs to the browser, not to the session.
   *
   * @param {Request} request - Express request containing the cookie and anti-CSRF header.
   * @param {Response} response - Express response whose refresh cookie is cleared.
   *
   * @returns {Promise<void>} Completion after revocation and cookie clearing.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    this.assertCsrf(request);
    const token: string | null = readCookie(request.headers.cookie, this.refreshCookie().name);
    if (token !== null) {
      await this.logoutUseCase.execute(token);
    }
    this.clear(response);
  }

  /**
   * Method jwks
   * @method jwks
   *
   * @description
   * Returns the configured public signing keys for other services to verify access tokens.
   *
   * @returns {IdentityHttpOptions['jwks']} Public JSON Web Key Set.
   */
  @Get('jwks.json')
  @Header('Cache-Control', 'public, max-age=600')
  public jwks(): IdentityHttpOptions['jwks'] {
    return this.options.jwks;
  }

  /**
   * Method refreshCookie
   * @method refreshCookie
   *
   * @description
   * Name and path of the refresh cookie for the configured security.
   *
   * @returns {IdentityCookie} Refresh cookie name and path.
   */
  private refreshCookie(): IdentityCookie {
    return identityCookie(REFRESH_COOKIE, this.options.cookieSecure);
  }

  /**
   * Method deviceCookie
   * @method deviceCookie
   *
   * @description
   * Name and path of the trusted-device cookie for the configured security.
   *
   * @returns {IdentityCookie} Device cookie name and path.
   */
  private deviceCookie(): IdentityCookie {
    return identityCookie(DEVICE_COOKIE, this.options.cookieSecure);
  }

  /**
   * Method cookieOptions
   * @method cookieOptions
   *
   * @description
   * Attributes shared by every identity cookie: `HttpOnly`, `SameSite=Strict`, `Secure` as configured, the path of `identityCookie` and never a `Domain`.
   *
   * @param {IdentityCookie} cookie - Cookie name and path.
   *
   * @returns {CookieOptions} Express cookie options without expiry.
   */
  private cookieOptions(cookie: IdentityCookie): CookieOptions {
    return {
      httpOnly: true,
      secure: this.options.cookieSecure,
      sameSite: 'strict',
      path: cookie.path,
    };
  }

  /**
   * Method open
   * @method open
   *
   * @description
   * Sets the refresh cookie, then maps the access credential to the response contract. A remembered session gets the refresh expiry; otherwise the cookie has neither `Expires` nor `Max-Age` and ends with the browser session.
   *
   * @param {Response} response - Express response receiving the cookie.
   * @param {Session} session - Newly issued access and refresh credentials.
   *
   * @returns {SessionResponse} Access token response fields.
   */
  private open(response: Response, session: Session): SessionResponse {
    const cookie: IdentityCookie = this.refreshCookie();
    response.cookie(cookie.name, session.refreshToken, {
      ...this.cookieOptions(cookie),
      ...(session.persistent ? { expires: session.refreshExpiresAt } : {}),
    });
    return { accessToken: session.access.token, expiresIn: session.access.expiresIn };
  }

  /**
   * Method trust
   * @method trust
   *
   * @description
   * Sets the trusted-device cookie until the fixed device expiry.
   *
   * @param {Response} response - Express response receiving the cookie.
   * @param {IssuedDevice} device - New trusted-device credential.
   *
   * @returns {void} Completes after the cookie header is scheduled.
   */
  private trust(response: Response, device: IssuedDevice): void {
    const cookie: IdentityCookie = this.deviceCookie();
    response.cookie(cookie.name, device.token, {
      ...this.cookieOptions(cookie),
      expires: device.expiresAt,
    });
  }

  /**
   * Method clear
   * @method clear
   *
   * @description
   * Clears the refresh cookie using the same name, path and security attributes used when setting it.
   *
   * @param {Response} response - Express response whose refresh cookie is cleared.
   *
   * @returns {void} Completes after the clear-cookie header is scheduled.
   */
  private clear(response: Response): void {
    const cookie: IdentityCookie = this.refreshCookie();
    response.clearCookie(cookie.name, this.cookieOptions(cookie));
  }

  /**
   * Method logRefusal
   * @method logRefusal
   *
   * @description
   * Logs an authentication refusal by its code only, never with the submitted values; other errors are left to the problem filter.
   *
   * @param {string} label - Step that refused.
   * @param {unknown} error - Error thrown by the use case.
   *
   * @returns {void} Completes after logging.
   */
  private logRefusal(label: string, error: unknown): void {
    if (
      error instanceof InvalidCredentialsError ||
      error instanceof AccountLockedError ||
      error instanceof ChallengeExpiredError
    ) {
      this.logger.warn(`${label} (${error.code})`);
    }
  }

  /**
   * Method assertCsrf
   * @method assertCsrf
   *
   * @description
   * Requires the configured anti-CSRF header to equal `1` before cookie-backed state changes.
   *
   * @param {Request} request - Express request to inspect.
   *
   * @returns {void} Completes when the header is present.
   *
   * @throws {ForbiddenException} When the anti-CSRF header is missing or differs from `1`.
   */
  private assertCsrf(request: Request): void {
    if (request.headers[CSRF_HEADER] !== '1') {
      throw new ForbiddenException({ code: 'auth.csrf', message: 'Missing anti-CSRF header.' });
    }
  }
  // #endregion
}
