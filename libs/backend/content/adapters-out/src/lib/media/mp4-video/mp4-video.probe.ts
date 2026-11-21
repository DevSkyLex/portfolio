import {
  type ProbedVideo,
  UnsupportedMediaError,
  type VideoProbe,
} from '@vfortin/content-application';

/**
 * Constant STILL_IMAGE_BRANDS
 *
 * @description
 * Major brands of ISO base media files that hold still images (AVIF, HEIF), handled by the image
 * processor rather than as videos.
 */
const STILL_IMAGE_BRANDS: ReadonlySet<string> = new Set([
  'avif',
  'avis',
  'heic',
  'heix',
  'heim',
  'heis',
  'hevc',
  'hevx',
  'mif1',
  'msf1',
]);

/**
 * Interface Box
 * @interface Box
 *
 * @description
 * One ISO base media box: its four-character type and the byte range of its payload.
 */
interface Box {
  // #region Properties
  /**
   * Property type
   * @readonly
   *
   * @description
   * Four-character box type.
   */
  readonly type: string;

  /**
   * Property start
   * @readonly
   *
   * @description
   * Offset of the payload, after the header.
   */
  readonly start: number;

  /**
   * Property end
   * @readonly
   *
   * @description
   * Offset just past the box.
   */
  readonly end: number;
  // #endregion
}

/**
 * Class Mp4VideoProbe
 * @class Mp4VideoProbe
 * @implements {VideoProbe}
 *
 * @description
 * Reads the box structure of an MP4 (ISO base media) file without decoding it (D57): the `ftyp` box
 * tells a video from an AVIF or HEIF image, and the track header of the first video track gives the
 * display size, swapped for a 90 or 270 degree rotation matrix.
 */
export class Mp4VideoProbe implements VideoProbe {
  // #region Methods
  /**
   * Method probe
   * @method probe
   *
   * @description
   * Recognizes an MP4 video and returns its display size.
   *
   * @param {Uint8Array} bytes - Uploaded bytes.
   * @throws {UnsupportedMediaError} When an MP4 has no readable video track.
   * @returns {ProbedVideo | null} Display size, or `null` when the bytes are not an MP4 video.
   */
  public probe(bytes: Uint8Array): ProbedVideo | null {
    const view: DataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const top: Box[] = boxes(view, 0, bytes.byteLength);
    const ftyp: Box | undefined = top[0]?.type === 'ftyp' ? top[0] : undefined;
    if (ftyp === undefined || ftyp.end - ftyp.start < 4) {
      return null;
    }
    if (STILL_IMAGE_BRANDS.has(fourCc(view, ftyp.start))) {
      return null;
    }
    const moov: Box | undefined = top.find((box: Box): boolean => box.type === 'moov');
    for (const trak of moov === undefined ? [] : children(view, moov, 'trak')) {
      if (handler(view, trak) !== 'vide') {
        continue;
      }
      const size: ProbedVideo | null = trackSize(view, trak);
      if (size !== null) {
        return size;
      }
    }
    throw new UnsupportedMediaError('Send an MP4 video with a readable video track.');
  }
  // #endregion
}

/**
 * Function boxes
 *
 * @description
 * Lists the boxes laid out between two offsets; stops at the first truncated or malformed header.
 *
 * @param {DataView} view - File bytes.
 * @param {number} from - First box offset.
 * @param {number} to - Offset just past the last box.
 * @returns {Box[]} Boxes in file order.
 */
function boxes(view: DataView, from: number, to: number): Box[] {
  const found: Box[] = [];
  let offset: number = from;
  while (offset + 8 <= to) {
    let size: number = view.getUint32(offset);
    let header: number = 8;
    if (size === 1) {
      if (offset + 16 > to) break;
      size = Number(view.getBigUint64(offset + 8));
      header = 16;
    } else if (size === 0) {
      size = to - offset;
    }
    if (size < header || offset + size > to) break;
    found.push({ type: fourCc(view, offset + 4), start: offset + header, end: offset + size });
    offset += size;
  }
  return found;
}

/**
 * Function children
 *
 * @description
 * Lists the direct children of a container box with the supplied type.
 *
 * @param {DataView} view - File bytes.
 * @param {Box} parent - Container box.
 * @param {string} type - Child type to keep.
 * @returns {Box[]} Matching children.
 */
function children(view: DataView, parent: Box, type: string): Box[] {
  return boxes(view, parent.start, parent.end).filter((box: Box): boolean => box.type === type);
}

/**
 * Function handler
 *
 * @description
 * Reads the handler type of a track (`vide` for video) from `mdia/hdlr`.
 *
 * @param {DataView} view - File bytes.
 * @param {Box} trak - Track box.
 * @returns {string | null} Handler type, or `null` when absent.
 */
function handler(view: DataView, trak: Box): string | null {
  const mdia: Box | undefined = children(view, trak, 'mdia')[0];
  const hdlr: Box | undefined = mdia === undefined ? undefined : children(view, mdia, 'hdlr')[0];
  // Full box header (4), pre_defined (4), then handler_type.
  return hdlr === undefined || hdlr.end - hdlr.start < 12 ? null : fourCc(view, hdlr.start + 8);
}

/**
 * Function trackSize
 *
 * @description
 * Reads the display size of a track header (`tkhd`), applying a quarter-turn rotation.
 *
 * @param {DataView} view - File bytes.
 * @param {Box} trak - Track box.
 * @returns {ProbedVideo | null} Display size, or `null` when the header is missing or empty.
 */
function trackSize(view: DataView, trak: Box): ProbedVideo | null {
  const tkhd: Box | undefined = children(view, trak, 'tkhd')[0];
  if (tkhd === undefined) return null;
  // Version 1 widens the creation, modification and duration fields from 32 to 64 bits.
  const matrix: number = tkhd.start + (view.getUint8(tkhd.start) === 1 ? 52 : 40);
  if (matrix + 44 > tkhd.end) return null;
  const width: number = Math.round(view.getUint32(matrix + 36) / 65536);
  const height: number = Math.round(view.getUint32(matrix + 40) / 65536);
  if (width === 0 || height === 0) return null;
  // Matrix coefficient `a` is zero for a 90 or 270 degree rotation: the frame is shown on its side.
  const quarterTurn: boolean = view.getInt32(matrix) === 0;
  return quarterTurn ? { width: height, height: width } : { width, height };
}

/**
 * Function fourCc
 *
 * @description
 * Reads a four-character code.
 *
 * @param {DataView} view - File bytes.
 * @param {number} offset - Code offset.
 * @returns {string} Four ASCII characters.
 */
function fourCc(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}
