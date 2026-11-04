import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { GoogleAccessTokens } from '@internal/content-adapters-out/lib/seo/google-credentials/google-service-account';

/**
 * Interface RecordedRequest
 * @interface RecordedRequest
 *
 * @description
 * Request received by the fake Google server.
 */
export interface RecordedRequest {
  // #region Properties
  /**
   * Property method
   * @readonly
   *
   * @description
   * HTTP method.
   */
  readonly method: string;

  /**
   * Property url
   * @readonly
   *
   * @description
   * Path and query.
   */
  readonly url: string;

  /**
   * Property headers
   * @readonly
   *
   * @description
   * Request headers.
   */
  readonly headers: IncomingMessage['headers'];

  /**
   * Property body
   * @readonly
   *
   * @description
   * Parsed JSON body, `null` without body.
   */
  readonly body: unknown;
  // #endregion
}

/**
 * Interface FakeReply
 * @interface FakeReply
 *
 * @description
 * Answer of the fake server: a status and a JSON or raw body, optionally late.
 */
export interface FakeReply {
  // #region Properties
  /**
   * Property status
   * @readonly
   *
   * @description
   * HTTP status, 200 by default.
   */
  readonly status?: number;

  /**
   * Property json
   * @readonly
   *
   * @description
   * Body serialized as JSON.
   */
  readonly json?: unknown;

  /**
   * Property raw
   * @readonly
   *
   * @description
   * Body sent as is, instead of `json`.
   */
  readonly raw?: string;

  /**
   * Property delayMs
   * @readonly
   *
   * @description
   * Wait before answering.
   */
  readonly delayMs?: number;
  // #endregion
}

/**
 * Class FakeGoogleServer
 * @class FakeGoogleServer
 *
 * @description
 * Local HTTP server standing for the Google APIs in adapter tests (no network): it records every
 * request and answers with the reply its handler returns.
 */
export class FakeGoogleServer {
  // #region Properties
  /**
   * Property requests
   * @readonly
   *
   * @description
   * Requests received, in order.
   */
  public readonly requests: RecordedRequest[] = [];

  /**
   * Property handler
   *
   * @description
   * Reply of each request; an empty 200 JSON object by default.
   */
  public handler: (request: RecordedRequest) => FakeReply = (): FakeReply => ({ json: {} });

  /**
   * Property server
   * @readonly
   *
   * @description
   * Node server.
   */
  private readonly server: Server = createServer(
    (request: IncomingMessage, response: ServerResponse): void => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer): number => chunks.push(chunk));
      request.on('end', (): void => {
        const text: string = Buffer.concat(chunks).toString('utf8');
        const recorded: RecordedRequest = {
          method: request.method ?? 'GET',
          url: request.url ?? '/',
          headers: request.headers,
          body: text === '' ? null : (JSON.parse(text) as unknown),
        };
        this.requests.push(recorded);
        const reply: FakeReply = this.handler(recorded);
        const send = (): void => {
          if (response.destroyed) return;
          response.writeHead(reply.status ?? 200, { 'content-type': 'application/json' });
          response.end(reply.raw ?? JSON.stringify(reply.json ?? {}));
        };
        if (reply.delayMs) setTimeout(send, reply.delayMs);
        else send();
      });
    },
  );
  // #endregion

  // #region Methods
  /**
   * Method start
   * @method start
   *
   * @description
   * Listens on a free loopback port.
   *
   * @returns {Promise<string>} Origin of the server.
   */
  public async start(): Promise<string> {
    await new Promise<void>((resolve: () => void): void => {
      this.server.listen(0, '127.0.0.1', resolve);
    });
    return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  /**
   * Method stop
   * @method stop
   *
   * @description
   * Closes the server and its connections.
   *
   * @returns {Promise<void>} Completion after closing.
   */
  public async stop(): Promise<void> {
    this.server.closeAllConnections();
    await new Promise<void>((resolve: () => void): void => {
      this.server.close((): void => resolve());
    });
  }
  // #endregion
}

/**
 * Constant FAKE_TOKEN
 *
 * @description
 * Access token of the fake token source, shaped like a Google one so redaction is exercised.
 */
export const FAKE_TOKEN: string = 'ya29.fake-access-token';

/**
 * Constant fakeTokens
 *
 * @description
 * Token source returning `FAKE_TOKEN`.
 */
export const fakeTokens: GoogleAccessTokens = { token: async (): Promise<string> => FAKE_TOKEN };
