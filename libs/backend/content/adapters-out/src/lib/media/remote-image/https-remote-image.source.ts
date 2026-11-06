import type { RemoteImageSource } from '@vfortin/content-application';
import { HttpsFetcher, type HttpsFetcherOptions } from '@vfortin/backend-http';

/**
 * Constant REMOTE_IMAGE_TIMEOUT_MS
 *
 * @description
 * Deadline of one image download, from the request to the last byte, in milliseconds.
 *
 * @type {number}
 */
export const REMOTE_IMAGE_TIMEOUT_MS: number = 15_000;

/**
 * Constant REMOTE_IMAGE_REDIRECTS
 *
 * @description
 * Redirects followed (image hosts and CDNs commonly answer one); each target is checked again.
 *
 * @type {number}
 */
export const REMOTE_IMAGE_REDIRECTS: number = 3;

/**
 * Class HttpsRemoteImageSource
 * @class HttpsRemoteImageSource
 * @implements RemoteImageSource
 *
 * @description
 * Downloads MCP image URLs through `HttpsFetcher` (D54): `https` on port 443, every resolved address
 * public, at most three redirects, the upload size cap and fifteen seconds. The bytes are then decoded
 * and re-encoded by the upload use case; the declared type is never trusted.
 */
export class HttpsRemoteImageSource implements RemoteImageSource {
  // #region Properties
  private readonly fetcher: HttpsFetcher;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Builds the guarded fetcher.
   *
   * @param {number} maxBytes - Largest accepted image, the upload cap (`MEDIA_UPLOAD_LIMITS.bytes`).
   * @param {Partial<Omit<HttpsFetcherOptions, 'userAgent'>>} options - Transport seams, for tests.
   */
  public constructor(
    private readonly maxBytes: number,
    options: Partial<Omit<HttpsFetcherOptions, 'userAgent'>> = {},
  ) {
    this.fetcher = new HttpsFetcher({
      ...options,
      timeoutMs: options.timeoutMs ?? REMOTE_IMAGE_TIMEOUT_MS,
      userAgent: 'portfolio-content',
    });
  }
  // #endregion

  // #region Methods
  public async fetch(url: string): Promise<Uint8Array> {
    const { body } = await this.fetcher.fetch(url, {
      maxBytes: this.maxBytes,
      accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif;q=0.9,*/*;q=0.1',
      redirects: REMOTE_IMAGE_REDIRECTS,
    });
    return new Uint8Array(body);
  }
  // #endregion
}
