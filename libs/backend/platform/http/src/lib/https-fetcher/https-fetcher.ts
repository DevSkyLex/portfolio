import { type LookupAddress, type LookupAllOptions, lookup as dnsLookup } from 'node:dns';
import type {
  ClientRequest,
  IncomingHttpHeaders,
  IncomingMessage,
  RequestOptions,
} from 'node:http';
import { request as httpsRequest } from 'node:https';
import { type LookupFunction, isIP } from 'node:net';
import { isPublicAddress } from '@internal/backend-http/lib/address-policy/address-policy';

/**
 * Interface HttpsFetcherOptions
 * @interface HttpsFetcherOptions
 *
 * @description
 * Transport seams, for tests: the request function, DNS lookup, address policy, ports and deadline.
 */
export interface HttpsFetcherOptions {
  // #region Properties
  /** Request function, `https.request` by default. */
  readonly request?: (
    options: RequestOptions,
    callback: (response: IncomingMessage) => void,
  ) => ClientRequest;
  /** DNS lookup, `dns.lookup` by default. */
  readonly lookup?: (
    hostname: string,
    options: LookupAllOptions,
    callback: (error: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void,
  ) => void;
  /** Address policy, `isPublicAddress` by default. */
  readonly isAllowedAddress?: (address: string) => boolean;
  /** Accepted ports, `[443]` by default. */
  readonly ports?: readonly number[];
  /** Deadline of one request, from the request to the last byte, in milliseconds. */
  readonly timeoutMs: number;
  /** `User-Agent` sent with every request. */
  readonly userAgent: string;
  // #endregion
}

/**
 * Interface HttpsFetchRequest
 * @interface HttpsFetchRequest
 *
 * @description
 * One bounded GET: the largest body accepted, the `Accept` header and how many redirects to follow.
 */
export interface HttpsFetchRequest {
  // #region Properties
  readonly maxBytes: number;
  readonly accept: string;
  /** Redirects followed, each target checked like the first URL; `0` refuses any redirect. */
  readonly redirects?: number;
  // #endregion
}

/**
 * Interface HttpsFetchedBody
 * @interface HttpsFetchedBody
 *
 * @description
 * Final URL, headers and bytes of a successful (200) bounded fetch.
 */
export interface HttpsFetchedBody {
  // #region Properties
  readonly url: string;
  readonly headers: IncomingHttpHeaders;
  readonly body: Buffer;
  // #endregion
}

/**
 * Constant REDIRECT_STATUSES
 *
 * @description
 * Statuses whose `Location` the fetcher may follow.
 *
 * @type {ReadonlySet<number>}
 */
const REDIRECT_STATUSES: ReadonlySet<number> = new Set<number>([301, 302, 303, 307, 308]);

/**
 * Class HttpsFetcher
 * @class HttpsFetcher
 *
 * @description
 * GET of a URL a client supplied, without letting it reach the server's own network (D45, D54):
 * `https` URLs on an accepted port without credentials only; the host is resolved by a lookup that
 * refuses the connection unless every resolved address passes the address policy, and the socket
 * connects to those same addresses (no DNS rebinding between check and use). Only a 200 is accepted,
 * within the size limit and the deadline; each followed redirect is checked again.
 */
export class HttpsFetcher {
  // #region Properties
  private readonly request: NonNullable<HttpsFetcherOptions['request']>;
  private readonly lookup: NonNullable<HttpsFetcherOptions['lookup']>;
  private readonly isAllowedAddress: (address: string) => boolean;
  private readonly ports: readonly number[];
  private readonly timeoutMs: number;
  private readonly userAgent: string;
  // #endregion

  // #region Constructor
  public constructor(options: HttpsFetcherOptions) {
    this.request = options.request ?? httpsRequest;
    this.lookup = options.lookup ?? dnsLookup;
    this.isAllowedAddress = options.isAllowedAddress ?? isPublicAddress;
    this.ports = options.ports ?? [443];
    this.timeoutMs = options.timeoutMs;
    this.userAgent = options.userAgent;
  }
  // #endregion

  // #region Methods
  /**
   * Fetches the URL, following at most `request.redirects` redirects.
   *
   * @param {string} url - Absolute URL supplied by a client.
   * @param {HttpsFetchRequest} request - Size limit, accepted types and redirect budget.
   * @returns {Promise<HttpsFetchedBody>} The 200 response; rejects on a refused URL, address, status,
   * size or deadline.
   */
  public async fetch(url: string, request: HttpsFetchRequest): Promise<HttpsFetchedBody> {
    let current: string = url;
    for (let hop: number = 0; ; hop++) {
      const response: { readonly status: number; readonly location?: string } | HttpsFetchedBody =
        await this.once(current, request.maxBytes, request.accept);
      if ('body' in response) return response;
      if (response.location === undefined || hop >= (request.redirects ?? 0)) {
        throw new Error(`Refused response (${response.status}).`);
      }
      current = new URL(response.location, current).toString();
    }
  }

  private target(url: string): URL {
    const parsed: URL = new URL(url);
    const port: number = parsed.port === '' ? 443 : Number(parsed.port);
    const host: string = parsed.hostname.replace(/^\[(.*)\]$/, '$1');
    if (
      parsed.protocol !== 'https:' ||
      !this.ports.includes(port) ||
      parsed.username !== '' ||
      parsed.password !== '' ||
      (isIP(host) !== 0 && !this.isAllowedAddress(host))
    ) {
      throw new Error('Refused outbound URL.');
    }
    return parsed;
  }

  private once(
    url: string,
    maxBytes: number,
    accept: string,
  ): Promise<{ readonly status: number; readonly location?: string } | HttpsFetchedBody> {
    const target: URL = this.target(url);
    const lookup: LookupFunction = (hostname, options, callback): void => {
      this.lookup(hostname, { ...options, all: true }, (error, addresses): void => {
        if (error !== null) {
          callback(error, '', 0);
          return;
        }
        const first: LookupAddress | undefined = addresses[0];
        if (
          first === undefined ||
          addresses.some((one: LookupAddress): boolean => !this.isAllowedAddress(one.address))
        ) {
          callback(new Error('Refused address.'), '', 0);
          return;
        }
        if (options.all) {
          callback(null, addresses);
        } else {
          callback(null, first.address, first.family);
        }
      });
    };
    return new Promise(
      (
        resolve: (
          value: { readonly status: number; readonly location?: string } | HttpsFetchedBody,
        ) => void,
        reject: (reason: Error) => void,
      ): void => {
        const request: ClientRequest = this.request(
          {
            hostname: target.hostname.replace(/^\[(.*)\]$/, '$1'),
            port: target.port === '' ? 443 : Number(target.port),
            path: `${target.pathname}${target.search}`,
            method: 'GET',
            headers: { accept, 'user-agent': this.userAgent },
            lookup,
            agent: false,
            timeout: this.timeoutMs,
          },
          (response: IncomingMessage): void => {
            const status: number = response.statusCode ?? 0;
            if (REDIRECT_STATUSES.has(status)) {
              clearTimeout(deadline);
              const location: string | undefined = response.headers.location;
              response.resume();
              resolve(location === undefined ? { status } : { status, location });
              return;
            }
            const length: number = Number(response.headers['content-length'] ?? 0);
            if (status !== 200 || length > maxBytes) {
              request.destroy(
                new Error(status === 200 ? 'Response too large.' : `Refused response (${status}).`),
              );
              return;
            }
            const chunks: Buffer[] = [];
            let size: number = 0;
            let oversized: boolean = false;
            response.on('data', (chunk: Buffer): void => {
              size += chunk.length;
              if (size > maxBytes) {
                // A truncated body must never resolve: `end` may still fire after the destroy.
                oversized = true;
                request.destroy(new Error('Response too large.'));
                return;
              }
              chunks.push(chunk);
            });
            response.on('end', (): void => {
              clearTimeout(deadline);
              if (oversized) reject(new Error('Response too large.'));
              else resolve({ url, headers: response.headers, body: Buffer.concat(chunks) });
            });
            response.on('error', (error: Error): void => reject(error));
          },
        );
        const deadline: NodeJS.Timeout = setTimeout(
          (): void => void request.destroy(new Error('Outbound fetch timed out.')),
          this.timeoutMs,
        );
        request.on(
          'timeout',
          (): void => void request.destroy(new Error('Outbound fetch timed out.')),
        );
        request.on('error', (error: Error): void => {
          clearTimeout(deadline);
          reject(error);
        });
        request.end();
      },
    );
  }
  // #endregion
}
