import { type DynamicModule, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { LoggerModule } from 'nestjs-pino';
import { HealthController } from '@internal/backend-observability/lib/controllers/health/health.controller';

/**
 * Constant REQUEST_ID_HEADER
 *
 * @description
 * Header used to receive and return the request correlation identifier.
 */
export const REQUEST_ID_HEADER = 'x-request-id' as const;

/**
 * Constant REQUEST_ID
 *
 * @description
 * Accepts bounded word-and-hyphen correlation identifiers supplied by upstream callers.
 */
const REQUEST_ID: RegExp = /^[\w-]{8,64}$/;

/**
 * Constant LOG_REDACTIONS
 *
 * @description
 * Pino paths removed from request and response logs to keep bearer credentials, cookies and client network addresses private.
 *
 * @type {string[]}
 */
export const LOG_REDACTIONS: string[] = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-forwarded-for"]',
  'req.headers["x-real-ip"]',
  'req.remoteAddress',
  'req.remotePort',
  'res.headers["set-cookie"]',
];

/**
 * Interface ObservabilityOptions
 * @interface ObservabilityOptions
 *
 * @description
 * Supplies service identity, log verbosity and development formatting to the observability module.
 */
export interface ObservabilityOptions {
  // #region Properties
  /**
   * Property service
   * @readonly
   *
   * @description
   * Service identifier attached to every structured log record.
   *
   * @type {string}
   */
  readonly service: string;

  /**
   * Property level
   * @readonly
   *
   * @description
   * Pino minimum log level configured for the service.
   *
   * @type {string}
   */
  readonly level: string;

  /**
   * Property pretty
   * @readonly
   *
   * @description
   * Enables the pino-pretty transport for readable local development output.
   *
   * @type {boolean}
   */
  readonly pretty: boolean;
  // #endregion
}

/**
 * Function resolveRequestId
 *
 * @description
 * Reuses a syntactically valid incoming correlation ID or generates a UUID, then echoes it in the response header.
 *
 * @param {IncomingMessage} req - Incoming Node request containing the optional request ID header.
 * @param {ServerResponse} res - Response that receives the resolved ID header.
 * @returns {string} Correlation identifier used for the request lifecycle.
 */
export function resolveRequestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming: string | string[] | undefined = req.headers[REQUEST_ID_HEADER];
  const id: string =
    typeof incoming === 'string' && REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
}

/**
 * Class ObservabilityModule
 * @class ObservabilityModule
 *
 * @description
 * Configures structured request logging, sensitive-field redaction, request correlation and health endpoints for a service.
 */
@Module({})
export class ObservabilityModule {
  // #region Methods
  /**
   * Method forRoot
   * @method forRoot
   * @static
   *
   * @description
   * Produces global logging and health providers with the supplied service identity, level and development formatting.
   *
   * @param {ObservabilityOptions} options - Runtime logging settings for this service.
   * @returns {DynamicModule} Nest module configured with redaction and health controllers.
   */
  public static forRoot(options: ObservabilityOptions): DynamicModule {
    return {
      module: ObservabilityModule,
      global: true,
      imports: [
        TerminusModule,
        LoggerModule.forRoot({
          pinoHttp: {
            level: options.level,
            base: { service: options.service },
            genReqId: resolveRequestId,
            customAttributeKeys: { reqId: 'requestId' },
            redact: LOG_REDACTIONS,
            ...(options.pretty ? { transport: { target: 'pino-pretty' } } : {}),
          },
        }),
      ],
      controllers: [HealthController],
      exports: [LoggerModule],
    };
  }
  // #endregion
}
