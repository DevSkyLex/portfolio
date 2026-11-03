import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Optional,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Interface MappedProblem
 * @interface MappedProblem
 *
 * @description
 * Context-owned HTTP problem data supplied to the shared RFC 7807 response filter.
 */
export interface MappedProblem {
  // #region Properties
  /**
   * Property status
   * @readonly
   *
   * @description
   * HTTP status selected for the mapped context error.
   *
   * @type {number}
   */
  readonly status: number;

  /**
   * Property code
   * @readonly
   *
   * @description
   * Stable machine-readable code consumed by API clients.
   *
   * @type {string}
   */
  readonly code: string;

  /**
   * Property title
   * @readonly
   *
   * @description
   * Human-readable summary for the problem response.
   *
   * @type {string}
   */
  readonly title: string;

  /**
   * Property details
   * @readonly
   *
   * @description
   * Optional ordered details describing the mapped failure.
   *
   * @type {readonly string[]}
   */
  readonly details?: readonly string[];

  /**
   * Property errors
   * @readonly
   *
   * @description
   * Optional context-specific field-error payload preserved for clients.
   *
   * @type {unknown}
   */
  readonly errors?: unknown;
  // #endregion
}

/**
 * Type ProblemMapper
 * @type ProblemMapper
 *
 * @description
 * Maps an application error to context-owned problem data, or returns `null` when shared HTTP handling should decide.
 */
export type ProblemMapper = (exception: unknown) => MappedProblem | null;

/**
 * Constant PROBLEM_MAPPER
 *
 * @description
 * Nest injection token through which a service composition supplies its context-specific error translation.
 */
export const PROBLEM_MAPPER: unique symbol = Symbol('PROBLEM_MAPPER');

/**
 * Interface ProblemDetails
 * @interface ProblemDetails
 *
 * @description
 * Extends mapped problem data with RFC 7807 resource identity and an optional request correlation identifier.
 */
interface ProblemDetails extends MappedProblem {
  // #region Properties
  /**
   * Property type
   * @readonly
   *
   * @description
   * URI reference identifying the problem type; this filter uses the generic `about:blank` value.
   *
   * @type {string}
   */
  readonly type: string;

  /**
   * Property instance
   * @readonly
   *
   * @description
   * Request URL that identifies the occurrence of this problem.
   *
   * @type {string}
   */
  readonly instance: string;

  /**
   * Property requestId
   * @readonly
   *
   * @description
   * Optional correlation identifier copied from the request for log and response tracing.
   *
   * @type {string | undefined}
   */
  readonly requestId?: string;
  // #endregion
}

/**
 * Class ProblemDetailsFilter
 * @class ProblemDetailsFilter
 *
 * @description
 * Translates context errors using the service mapper, preserves explicit Nest HTTP statuses, and hides unknown error details behind HTTP 500.
 * Responses use `application/problem+json`; failures are logged and a response already started is only ended.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  // #region Properties
  /**
   * Property logger
   * @readonly
   *
   * @description
   * Logger used to record server-side failures without exposing their details in client responses.
   *
   * @type {Logger}
   */
  private readonly logger: Logger = new Logger(ProblemDetailsFilter.name);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Accepts the context mapper when registered and falls back to generic HTTP problem handling otherwise.
   *
   * @param {ProblemMapper | null} mapper - Optional context error translator injected by the service composition.
   */
  public constructor(
    @Optional() @Inject(PROBLEM_MAPPER) private readonly mapper: ProblemMapper | null = null,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method catch
   * @method catch
   *
   * @description
   * Builds the problem payload, logs server failures, and writes the HTTP response unless headers were already sent.
   *
   * @param {unknown} exception - Error raised while handling the request.
   * @param {ArgumentsHost} host - Nest execution host used to access the HTTP request and response.
   * @returns {void} No response body is written when the response has already started; that stream is ended.
   */
  public catch(exception: unknown, host: ArgumentsHost): void {
    const http: ReturnType<ArgumentsHost['switchToHttp']> = host.switchToHttp();
    const request: Request & { id?: string } = http.getRequest<Request & { id?: string }>();
    const response: Response = http.getResponse<Response>();
    const base: { requestId?: string; type: string; instance: string } = {
      type: 'about:blank',
      instance: request.originalUrl,
      ...(request.id ? { requestId: String(request.id) } : {}),
    };

    const problem: ProblemDetails = { ...base, ...this.toProblem(exception) };
    if (problem.status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }
    if (response.headersSent) {
      // Failure after the response started (stream): it can only be cut short.
      response.end();
      return;
    }
    response.status(problem.status).type('application/problem+json').json(problem);
  }

  /**
   * Method toProblem
   * @method toProblem
   *
   * @description
   * Applies the context mapper first, then translates Nest HTTP exceptions, and finally hides unknown failures as HTTP 500.
   *
   * @param {unknown} exception - Error to classify.
   * @returns {MappedProblem} Safe status, code, title and optional field errors for the response.
   */
  private toProblem(exception: unknown): MappedProblem {
    const mapped: MappedProblem | null | undefined = this.mapper?.(exception);
    if (mapped) {
      return mapped;
    }
    if (exception instanceof HttpException) {
      const status: number = exception.getStatus();
      const body: string | object = exception.getResponse();
      const payload: Record<string, unknown> =
        typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
      return {
        title: exception.message,
        status,
        code: typeof payload['code'] === 'string' ? payload['code'] : `http.${status}`,
        ...(payload['errors'] === undefined ? {} : { errors: payload['errors'] }),
      };
    }
    return {
      title: 'Internal server error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'internal',
    };
  }
  // #endregion
}
