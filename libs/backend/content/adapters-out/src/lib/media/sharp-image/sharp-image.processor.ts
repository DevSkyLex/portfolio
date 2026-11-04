import {
  type ImageProcessor,
  type ProcessedImage,
  UnsupportedMediaError,
} from '@vfortin/content-application';
import sharp, { type Metadata, type OutputInfo, type Sharp, type SharpOptions } from 'sharp';

/**
 * Constant MAX_PIXELS
 *
 * @description
 * Largest decoded image accepted (50 megapixels, a 48 MP phone photo fits); it bounds the memory of
 * one decode, the 10 MiB upload limit alone does not (a small PNG can expand to gigabytes).
 */
export const MAX_PIXELS: number = 50_000_000;

/**
 * Constant FULL_WIDTH
 *
 * @description
 * Width cap of the full rendition, wide enough for the article column on high-density screens.
 */
const FULL_WIDTH: number = 2400;

/**
 * Constant SMALL_WIDTH
 *
 * @description
 * Width of the rendition used by the home project cards and as the smaller `srcset` candidate.
 */
const SMALL_WIDTH: number = 960;

/**
 * Constant DECODE
 *
 * @description
 * Decoder options: pixel limit and first frame only for animated GIF and WebP.
 */
const DECODE: SharpOptions = { limitInputPixels: MAX_PIXELS, animated: false };

/**
 * Constant HEADER
 *
 * @description
 * Options of the header read: sharp applies the pixel limit to metadata too, which would hide the
 * reason of the refusal; the limit is compared right after instead.
 */
const HEADER: SharpOptions = { limitInputPixels: false, animated: false };

/**
 * Function accepted
 *
 * @description
 * Whether the decoded format is one of the upload formats (D40); libvips reports AVIF as HEIF with
 * AV1 compression, and HEIC (HEVC) stays refused. SVG and every other format are refused.
 *
 * @param {Metadata} metadata - Header read by sharp.
 * @returns {boolean} Whether the format is accepted.
 */
function accepted(metadata: Metadata): boolean {
  switch (metadata.format) {
    case 'jpeg':
    case 'png':
    case 'webp':
    case 'gif':
      return true;
    case 'heif':
      return metadata.compression === 'av1';
    default:
      return false;
  }
}

/**
 * Class SharpImageProcessor
 * @class SharpImageProcessor
 *
 * @description
 * Re-encodes uploads to WebP with sharp: EXIF orientation applied, metadata dropped (sharp keeps none
 * unless asked) and colours converted to sRGB. The sharp cache is disabled because every input is
 * decoded once.
 */
export class SharpImageProcessor implements ImageProcessor {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Disables the libvips operation cache for the process.
   */
  public constructor() {
    sharp.cache(false);
  }
  // #endregion

  // #region Methods
  /**
   * Method process
   * @method process
   *
   * @description
   * Checks the format and pixel count from the header, then encodes the full rendition (at most
   * 2400 px wide, never enlarged) and, when it is wider than 960 px, the 960 px rendition. The
   * reported size is read from the encoder output, after orientation.
   *
   * @param {Uint8Array} bytes - Uploaded bytes.
   * @throws {UnsupportedMediaError} When the bytes are not an accepted image or exceed the pixel limit.
   * @returns {Promise<ProcessedImage>} WebP renditions and their size.
   */
  public async process(bytes: Uint8Array): Promise<ProcessedImage> {
    // Reading the header decodes no pixel, so the limit is checked here with a clear message.
    const metadata: Metadata = await this.decode(bytes, (image: Sharp) => image.metadata(), HEADER);
    if (!accepted(metadata)) {
      throw new UnsupportedMediaError();
    }
    if (metadata.width * metadata.height > MAX_PIXELS) {
      throw new UnsupportedMediaError('The image exceeds 50 megapixels.');
    }
    const full: { data: Buffer; info: OutputInfo } = await this.decode(bytes, (image: Sharp) =>
      this.encode(image, FULL_WIDTH),
    );
    const small: { data: Buffer; info: OutputInfo } | null =
      full.info.width > SMALL_WIDTH
        ? await this.decode(bytes, (image: Sharp) => this.encode(image, SMALL_WIDTH))
        : null;
    return {
      full: full.data,
      small: small?.data ?? null,
      width: full.info.width,
      height: full.info.height,
    };
  }

  /**
   * Method encode
   * @method encode
   *
   * @description
   * Orients, narrows to the width when larger and encodes to WebP.
   *
   * @param {Sharp} image - Decoder of the upload.
   * @param {number} width - Largest output width.
   * @returns {Promise<{ data: Buffer; info: OutputInfo }>} WebP bytes and output size.
   */
  private encode(image: Sharp, width: number): Promise<{ data: Buffer; info: OutputInfo }> {
    return image
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
  }

  /**
   * Method decode
   * @method decode
   * @template T - Result of the operation.
   *
   * @description
   * Runs an operation on a fresh decoder of the bytes and reports any decoding failure (unknown
   * format, truncated file, pixel limit) as an unsupported media.
   *
   * @param {Uint8Array} bytes - Uploaded bytes.
   * @param {(image: Sharp) => Promise<T>} operation - Work on the decoder.
   * @param {SharpOptions} options - Decoder options; `DECODE` unless only the header is read.
   * @returns {Promise<T>} Operation result.
   */
  private async decode<T>(
    bytes: Uint8Array,
    operation: (image: Sharp) => Promise<T>,
    options: SharpOptions = DECODE,
  ): Promise<T> {
    try {
      return await operation(sharp(bytes, options));
    } catch {
      // The libvips message stays out of the response: it describes the decoder, not the request.
      throw new UnsupportedMediaError(
        'The file is not a readable JPEG, PNG, WebP, AVIF or GIF image.',
      );
    }
  }
  // #endregion
}
