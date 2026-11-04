import type { ClientMetadataFetcher, FetchedClientMetadata } from '@vfortin/identity-application';
import { type LookupAddress, type LookupAllOptions, lookup as dnsLookup } from 'node:dns';
import type {
  ClientRequest,
  IncomingHttpHeaders,
  IncomingMessage,
  RequestOptions,
} from 'node:http';
import { request as httpsRequest } from 'node:https';
import { type LookupFunction, isIP } from 'node:net';
import { isPublicAddress } from '@internal/identity-adapters-out/lib/oauth/address-policy/address-policy';

/**
 * Constant METADATA_MAX_BYTES
 *
 * @description
 * Largest accepted metadata document, in bytes (the Client ID Metadata Document draft recommends
 * 5 kB).
 *
 * @type {number}
 */
export const METADATA_MAX_BYTES: number = 5 * 1024;

/**
 * Constant LOGO_MAX_BYTES
 *
 * @description
 * Largest accepted logo, in bytes.
 *
 * @type {number}
 */
export const LOGO_MAX_BYTES: number = 64 * 1024;

/**
 * Constant FETCH_TIMEOUT_MS
 *
 * @description
 * Deadline of one outbound fetch, from the request to the last byte, in milliseconds.
 *
 * @type {number}
 */
export const FETCH_TIMEOUT_MS: number = 5000;

/**
 * Constant LOGO_TYPES
 *
 * @description
 * Raster formats accepted as logos, recognised by their magic bytes (never by the declared type, and
 * never SVG).
 *
 * @type {ReadonlyArray<{ readonly type: string; readonly matches: (bytes: Buffer) => boolean }>}
 */
const LOGO_TYPES: ReadonlyArray<{
  readonly type: string;
  readonly matches: (bytes: Buffer) => boolean;
}> = [
  {
    type: 'image/png',
    matches: (bytes: Buffer): boolean =>
      bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    type: 'image/jpeg',
    matches: (bytes: Buffer): boolean =>
      bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  },
  {
    type: 'image/gif',
    matches: (bytes: Buffer): boolean => bytes.subarray(0, 4).toString('latin1') === 'GIF8',
  },
  {
    type: 'image/webp',
    matches: (bytes: Buffer): boolean =>
      bytes.subarray(0, 4).toString('latin1') === 'RIFF' &&
      bytes.subarray(8, 12).toString('latin1') === 'WEBP',
  },
];

/**
 * Interface ClientMetadataFetcherOptions
 * @interface ClientMetadataFetcherOptions
 *
 * @description
 * Transport seams, for tests: the request function, DNS lookup, address policy, ports and deadline.
 */
export interface ClientMetadataFetcherOptions {
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
  /** Deadline in milliseconds, `FETCH_TIMEOUT_MS` by default. */
  readonly timeoutMs?: number;
  // #endregion
}

/**
 * Interface FetchedBody
 * @interface FetchedBody
 *
 * @description
 * Status, headers and bytes of a bounded fetch.
 */
interface FetchedBody {
  // #region Properties
  readonly headers: IncomingHttpHeaders;
  readonly body: Buffer;
  // #endregion
}

/**
 * Function maxAgeOf
 *
 * @description
 * Reads the freshness a `Cache-Control` header allows: `0` for `no-store` or `no-cache`, `max-age`
 * otherwise, `null` without either.
 *
 * @param {string | undefined} header - `Cache-Control` value.
 *
 * @returns {number | null} Seconds, or `null`.
 */
export function maxAgeOf(header: string | undefined): number | null {
  const directives: string[] = (header ?? '')
    .toLowerCase()
    .split(',')
    .map((part: string): string => part.trim());
  if (directives.includes('no-store') || directives.includes('no-cache')) {
    return 0;
  }
  const maxAge: string | undefined = directives
    .find((part: string): boolean => /^max-age=\d+$/.test(part))
    ?.slice('max-age='.length);
  return maxAge === undefined ? null : Number(maxAge);
}

/**
 * Class HttpsClientMetadataFetcher
 * @class HttpsClientMetadataFetcher
 * @implements ClientMetadataFetcher
 *
 * @description
 * Fetches Client ID Metadata Documents and logos while resisting server-side request forgery (D45):
 * `https` URLs on port 443 without credentials only; the host is resolved by a lookup that refuses
 * the connection unless every resolved address is public (`isPublicAddress`), and the socket
 * connects to the checked address, so DNS rebinding cannot swap it; IP literals are checked the same
 * way; redirects are not followed; the body is capped (5 kB for a document, 64 kB for a logo) and the
 * whole exchange must finish within five seconds. No cookie or credential is ever sent.
 */
export class HttpsClientMetadataFetcher implements ClientMetadataFetcher {
  // #region Properties
  /** Request function. */
  private readonly request: NonNullable<ClientMetadataFetcherOptions['request']>;
  /** DNS lookup. */
  private readonly lookup: NonNullable<ClientMetadataFetcherOptions['lookup']>;
  /** Address policy. */
  private readonly isAllowedAddress: (address: string) => boolean;
  /** Accepted ports. */
  private readonly ports: readonly number[];
  /** Deadline in milliseconds. */
  private readonly timeoutMs: number;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Applies the transport defaults.
   *
   * @param {ClientMetadataFetcherOptions} options - Optional seams.
   */
  public constructor(options: ClientMetadataFetcherOptions = {}) {
    this.request = options.request ?? httpsRequest;
    this.lookup = options.lookup ?? dnsLookup;
    this.isAllowedAddress = options.isAllowedAddress ?? isPublicAddress;
    this.ports = options.ports ?? [443];
    this.timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS;
  }
  // #endregion

  // #region Methods
  /**
   * Method fetchDocument
   * @method fetchDocument
   *
   * @description
   * Fetches a JSON document (`application/json` or `application/*+json`) and its cache lifetime.
   *
   * @param {string} url - Client identifier URL.
   *
   * @returns {Promise<FetchedClientMetadata>} Parsed document; rejects on any refusal.
   */
  public async fetchDocument(url: string): Promise<FetchedClientMetadata> {
    const fetched: FetchedBody = await this.fetch(url, METADATA_MAX_BYTES);
    const type: string =
      (fetched.headers['content-type'] ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
    if (type !== 'application/json' && !/^application\/[\w.-]+\+json$/.test(type)) {
      throw new Error('Client metadata must be served as JSON.');
    }
    return {
      document: JSON.parse(fetched.body.toString('utf8')) as unknown,
      maxAgeSeconds: maxAgeOf(fetched.headers['cache-control']),
    };
  }

  /**
   * Method fetchLogo
   * @method fetchLogo
   *
   * @description
   * Fetches a raster logo recognised by its magic bytes and returns it as a `data:` URL.
   *
   * @param {string} url - `logo_uri`.
   *
   * @returns {Promise<string | null>} Logo, or `null` on any refusal or failure.
   */
  public async fetchLogo(url: string): Promise<string | null> {
    try {
      const { body } = await this.fetch(url, LOGO_MAX_BYTES);
      const kind: { readonly type: string } | undefined = LOGO_TYPES.find(
        (candidate: { readonly matches: (bytes: Buffer) => boolean }): boolean =>
          candidate.matches(body),
      );
      return kind ? `data:${kind.type};base64,${body.toString('base64')}` : null;
    } catch {
      return null;
    }
  }

  /**
   * Method target
   * @method target
   *
   * @description
   * Checks the URL before any network access.
   *
   * @param {string} url - Requested URL.
   *
   * @returns {URL} Parsed URL.
   *
   * @throws {Error} For another scheme or port, credentials, or a non-public IP literal.
   */
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

  /**
   * Method fetch
   * @method fetch
   *
   * @description
   * Performs one bounded GET: status 200 only (no redirect), body within `maxBytes`, deadline.
   *
   * @param {string} url - Requested URL.
   * @param {number} maxBytes - Body cap.
   *
   * @returns {Promise<FetchedBody>} Headers and body.
   */
  private fetch(url: string, maxBytes: number): Promise<FetchedBody> {
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
    return new Promise<FetchedBody>(
      (resolve: (value: FetchedBody) => void, reject: (reason: Error) => void): void => {
        const request: ClientRequest = this.request(
          {
            hostname: target.hostname.replace(/^\[(.*)\]$/, '$1'),
            port: target.port === '' ? 443 : Number(target.port),
            path: `${target.pathname}${target.search}`,
            method: 'GET',
            headers: {
              accept: 'application/json, image/*;q=0.8',
              'user-agent': 'portfolio-identity',
            },
            lookup,
            agent: false,
            timeout: this.timeoutMs,
          },
          (response: IncomingMessage): void => {
            const length: number = Number(response.headers['content-length'] ?? 0);
            if (response.statusCode !== 200 || length > maxBytes) {
              request.destroy(new Error(`Refused response (${response.statusCode ?? 0}).`));
              return;
            }
            const chunks: Buffer[] = [];
            let size: number = 0;
            response.on('data', (chunk: Buffer): void => {
              size += chunk.length;
              if (size > maxBytes) {
                request.destroy(new Error('Response too large.'));
                return;
              }
              chunks.push(chunk);
            });
            response.on('end', (): void => {
              clearTimeout(deadline);
              resolve({ headers: response.headers, body: Buffer.concat(chunks) });
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
