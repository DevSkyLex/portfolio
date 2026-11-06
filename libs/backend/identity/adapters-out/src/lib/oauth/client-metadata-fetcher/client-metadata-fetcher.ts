import type { ClientMetadataFetcher, FetchedClientMetadata } from '@vfortin/identity-application';
import { HttpsFetcher, type HttpsFetcherOptions } from '@vfortin/backend-http';

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
 * Constant ACCEPT
 *
 * @description
 * `Accept` header of the metadata and logo fetches.
 *
 * @type {string}
 */
const ACCEPT: string = 'application/json, image/*;q=0.8';

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
 * Type ClientMetadataFetcherOptions
 *
 * @description
 * Transport seams, for tests: the request function, DNS lookup, address policy, ports and deadline
 * (`FETCH_TIMEOUT_MS` by default).
 */
export type ClientMetadataFetcherOptions = Partial<Omit<HttpsFetcherOptions, 'userAgent'>>;

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
 * way (through `HttpsFetcher` of `@vfortin/backend-http`); redirects are not followed; the body is capped (5 kB for a document, 64 kB for a logo) and the
 * whole exchange must finish within five seconds. No cookie or credential is ever sent.
 */
export class HttpsClientMetadataFetcher implements ClientMetadataFetcher {
  // #region Properties
  private readonly fetcher: HttpsFetcher;
  // #endregion

  // #region Constructor
  public constructor(options: ClientMetadataFetcherOptions = {}) {
    this.fetcher = new HttpsFetcher({
      ...options,
      timeoutMs: options.timeoutMs ?? FETCH_TIMEOUT_MS,
      userAgent: 'portfolio-identity',
    });
  }
  // #endregion

  // #region Methods
  public async fetchDocument(url: string): Promise<FetchedClientMetadata> {
    const fetched: {
      readonly headers: Record<string, string | string[] | undefined>;
      readonly body: Buffer;
    } = await this.fetcher.fetch(url, { maxBytes: METADATA_MAX_BYTES, accept: ACCEPT });
    const type: string = String(fetched.headers['content-type'] ?? '')
      .replace(/;.*$/s, '')
      .trim()
      .toLowerCase();
    if (type !== 'application/json' && !/^application\/[\w.-]+\+json$/.test(type)) {
      throw new Error('Client metadata must be served as JSON.');
    }
    return {
      document: JSON.parse(fetched.body.toString('utf8')) as unknown,
      maxAgeSeconds: maxAgeOf(
        typeof fetched.headers['cache-control'] === 'string'
          ? fetched.headers['cache-control']
          : undefined,
      ),
    };
  }

  public async fetchLogo(url: string): Promise<string | null> {
    try {
      const { body } = await this.fetcher.fetch(url, { maxBytes: LOGO_MAX_BYTES, accept: ACCEPT });
      const kind: { readonly type: string } | undefined = LOGO_TYPES.find(
        (candidate: { readonly matches: (bytes: Buffer) => boolean }): boolean =>
          candidate.matches(body),
      );
      return kind ? `data:${kind.type};base64,${body.toString('base64')}` : null;
    } catch {
      return null;
    }
  }
  // #endregion
}
