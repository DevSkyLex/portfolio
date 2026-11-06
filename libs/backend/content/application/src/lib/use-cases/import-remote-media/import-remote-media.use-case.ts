import { MediaUnreachableError } from '@internal/content-application/lib/errors/application-error';
import type {
  MediaRecord,
  RemoteImageSource,
} from '@internal/content-application/lib/ports/content/content.ports';
import type { UploadMedia } from '@internal/content-application/lib/use-cases/upload-media/upload-media.use-case';

/**
 * Class ImportRemoteMedia
 * @class ImportRemoteMedia
 *
 * @description
 * Downloads an image from a URL and stores it like an uploaded file (D54): the same re-encoding,
 * deduplication and unlinked state until a project references it (`UploadMedia`, D40).
 */
export class ImportRemoteMedia {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the download source and the upload use case.
   *
   * @param {RemoteImageSource} source - Guarded downloader.
   * @param {UploadMedia} upload - Re-encodes and stores the bytes.
   */
  public constructor(
    private readonly source: RemoteImageSource,
    private readonly upload: UploadMedia,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Downloads then stores the image.
   *
   * @param {string} url - Absolute `https` URL of the image file.
   * @returns {Promise<MediaRecord>} The stored media; rejects with `MediaUnreachableError` when the
   * download fails, and with the upload errors (`UnsupportedMediaError`…) for bytes that are no image.
   */
  public async execute(url: string): Promise<MediaRecord> {
    let bytes: Uint8Array;
    try {
      bytes = await this.source.fetch(url);
    } catch (error: unknown) {
      throw new MediaUnreachableError(error instanceof Error ? error.message : 'unknown failure.');
    }
    return this.upload.execute(bytes);
  }
  // #endregion
}
