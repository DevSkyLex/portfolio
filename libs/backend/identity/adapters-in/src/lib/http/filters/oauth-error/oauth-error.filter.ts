import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { OAuthErrorResponse } from '@vfortin/identity-contracts';
import { type OAuthErrorCode, OAuthError } from '@vfortin/identity-domain';
import type { Response } from 'express';

/**
 * Constant STATUS_BY_ERROR
 *
 * @description
 * HTTP status of each protocol error that is not a 400: an unknown client is 401 (RFC 6749 §5.2),
 * the registration cap 429.
 *
 * @type {Partial<Record<OAuthErrorCode, number>>}
 */
const STATUS_BY_ERROR: Partial<Record<OAuthErrorCode, number>> = {
  invalid_client: HttpStatus.UNAUTHORIZED,
  temporarily_unavailable: HttpStatus.TOO_MANY_REQUESTS,
};

/**
 * Interface OAuthFailure
 * @interface OAuthFailure
 *
 * @description
 * Status and body of a protocol error response.
 */
export interface OAuthFailure {
  // #region Properties
  /** HTTP status. */
  readonly status: number;
  /** RFC 6749 error body. */
  readonly body: OAuthErrorResponse;
  // #endregion
}

/**
 * Function toOAuthFailure
 *
 * @description
 * Translates an exception of a protocol endpoint into the RFC 6749 error format: an `OAuthError`
 * keeps its code, a framework 4xx (oversized or malformed body) becomes `invalid_request` with its
 * status, anything else `server_error`.
 *
 * @param {unknown} exception - Thrown value.
 *
 * @returns {OAuthFailure} Status and body.
 */
export function toOAuthFailure(exception: unknown): OAuthFailure {
  if (exception instanceof OAuthError) {
    return {
      status: STATUS_BY_ERROR[exception.error] ?? HttpStatus.BAD_REQUEST,
      body: { error: exception.error, error_description: exception.description },
    };
  }
  if (exception instanceof HttpException && exception.getStatus() < 500) {
    return {
      status: exception.getStatus(),
      body: { error: 'invalid_request', error_description: exception.message },
    };
  }
  return { status: HttpStatus.INTERNAL_SERVER_ERROR, body: { error: 'server_error' } };
}

/**
 * Class OAuthErrorFilter
 * @class OAuthErrorFilter
 * @implements ExceptionFilter
 *
 * @description
 * Answers the failures of the protocol endpoints (token, revocation, registration, metadata) as
 * `application/json` `{ error, error_description }` with `Cache-Control: no-store`, as OAuth clients
 * expect, instead of the problem+json of the administration routes (D45). Applied per controller, it
 * takes precedence over the global problem filter.
 */
@Catch()
export class OAuthErrorFilter implements ExceptionFilter {
  // #region Properties
  /**
   * Property logger
   * @readonly
   *
   * @description
   * Records unexpected failures; protocol refusals are logged by their code only.
   *
   * @type {Logger}
   */
  private readonly logger: Logger = new Logger(OAuthErrorFilter.name);
  // #endregion

  // #region Methods
  /**
   * Method catch
   * @method catch
   *
   * @description
   * Writes the protocol error response.
   *
   * @param {unknown} exception - Thrown value.
   * @param {ArgumentsHost} host - Request context.
   */
  public catch(exception: unknown, host: ArgumentsHost): void {
    const response: Response = host.switchToHttp().getResponse<Response>();
    const failure: OAuthFailure = toOAuthFailure(exception);
    if (failure.status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    } else {
      this.logger.warn(`OAuth request refused (${failure.body.error})`);
    }
    response.status(failure.status).setHeader('Cache-Control', 'no-store').json(failure.body);
  }
  // #endregion
}
