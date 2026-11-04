import { MediaMissingError } from '@internal/content-application/lib/errors/application-error';
import type {
  Clock,
  IdGenerator,
  ImageProcessor,
  MediaRecord,
  MediaRepository,
  MediaStorage,
  ProcessedImage,
} from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Class UploadMedia
 * @class UploadMedia
 *
 * @description
 * Stores an uploaded image (D40): re-encoded by the image processor, written to the media storage,
 * then recorded. Uploads run one at a time in the process, which bounds the memory of decoding and
 * keeps the SHA-256 check free of races between two identical uploads.
 */
export class UploadMedia {
  // #region Properties
  /**
   * Property queue
   *
   * @description
   * Tail of the upload chain; each upload starts once the previous one settled.
   */
  private queue: Promise<unknown> = Promise.resolve();
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the media rows, the image processor, the file storage, the identifier source and the clock.
   *
   * @param {MediaRepository} media - Media rows.
   * @param {ImageProcessor} processor - Image decoder and WebP encoder.
   * @param {MediaStorage} storage - Media files.
   * @param {IdGenerator} ids - Random media identifiers.
   * @param {Clock} clock - Upload time source.
   */
  public constructor(
    private readonly media: MediaRepository,
    private readonly processor: ImageProcessor,
    private readonly storage: MediaStorage,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Returns the existing media when the same bytes were uploaded before, restarting its purge grace
   * period if no project references it. Otherwise processes the image, writes its files and inserts
   * its row, unlinked until a revision references it; the files are removed if the insert fails.
   *
   * @param {Uint8Array} bytes - Uploaded file.
   * @throws {MediaMissingError} When the file is empty.
   * @throws {UnsupportedMediaError} When the processor refuses the bytes.
   * @returns {Promise<MediaRecord>} Stored media.
   */
  public execute(bytes: Uint8Array): Promise<MediaRecord> {
    const run: Promise<MediaRecord> = this.queue.then((): Promise<MediaRecord> =>
      this.upload(bytes),
    );
    this.queue = run.catch((): undefined => undefined);
    return run;
  }

  /**
   * Method upload
   * @method upload
   *
   * @description
   * Performs one upload once the previous one settled.
   *
   * @param {Uint8Array} bytes - Uploaded file.
   * @returns {Promise<MediaRecord>} Stored media.
   */
  private async upload(bytes: Uint8Array): Promise<MediaRecord> {
    if (bytes.byteLength === 0) {
      throw new MediaMissingError('The file is empty.');
    }
    const sha256: string = await digest(bytes);
    const existing: MediaRecord | null = await this.media.findBySha256(sha256);
    if (existing !== null) {
      if (existing.unlinkedAt === null) {
        return existing;
      }
      const now: Date = this.clock.now();
      await this.media.markUnlinked([existing.id], now);
      return { ...existing, unlinkedAt: now };
    }
    const image: ProcessedImage = await this.processor.process(bytes);
    const now: Date = this.clock.now();
    const record: MediaRecord = {
      id: this.ids.next(),
      width: image.width,
      height: image.height,
      bytes: image.full.byteLength,
      sha256,
      hasSmall: image.small !== null,
      createdAt: now,
      unlinkedAt: now,
    };
    // Files first: a row never points to missing files, an orphan file is removed right away.
    await this.storage.put(record.id, { full: image.full, small: image.small });
    try {
      await this.media.insert(record);
    } catch (error: unknown) {
      await this.storage.remove(record.id);
      throw error;
    }
    return record;
  }
  // #endregion
}

/**
 * Function digest
 *
 * @description
 * Hashes bytes with the Web Crypto API, available in Node and browsers alike.
 *
 * @param {Uint8Array} bytes - Bytes to hash.
 * @returns {Promise<string>} Lowercase hexadecimal SHA-256.
 */
async function digest(bytes: Uint8Array): Promise<string> {
  // The copy gives Web Crypto the plain ArrayBuffer view it requires (Buffer may sit on a shared pool).
  const hash: ArrayBuffer = await globalThis.crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return [...new Uint8Array(hash)]
    .map((byte: number): string => byte.toString(16).padStart(2, '0'))
    .join('');
}
