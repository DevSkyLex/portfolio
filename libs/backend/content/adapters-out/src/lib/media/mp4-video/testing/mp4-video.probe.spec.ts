import { UnsupportedMediaError } from '@vfortin/content-application';
import { Mp4VideoProbe } from '@internal/content-adapters-out/lib/media/mp4-video/mp4-video.probe';

/**
 * Function box
 *
 * @description
 * Builds one ISO base media box from its type and payload parts.
 *
 * @param {string} type - Four-character type.
 * @param {...Uint8Array} parts - Payload parts, concatenated.
 * @returns {Uint8Array} Box bytes.
 */
function box(type: string, ...parts: Uint8Array[]): Uint8Array {
  const size: number =
    8 + parts.reduce((sum: number, part: Uint8Array): number => sum + part.length, 0);
  const out: Uint8Array = new Uint8Array(size);
  new DataView(out.buffer).setUint32(0, size);
  out.set(ascii(type), 4);
  let offset: number = 8;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/**
 * Function ascii
 *
 * @description
 * Encodes ASCII text.
 *
 * @param {string} text - Text.
 * @returns {Uint8Array} Bytes.
 */
function ascii(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/**
 * Function tkhd
 *
 * @description
 * Builds a version 0 track header with an identity or quarter-turn matrix and a display size.
 *
 * @param {number} width - Display width in pixels.
 * @param {number} height - Display height in pixels.
 * @param {boolean} rotated - Whether the matrix turns the frame by 90 degrees.
 * @returns {Uint8Array} Track header box.
 */
function tkhd(width: number, height: number, rotated: boolean = false): Uint8Array {
  const payload: Uint8Array = new Uint8Array(84);
  const view: DataView = new DataView(payload.buffer);
  // Matrix at 40: a, b, u, c, d, v, x, y, w in 16.16 (u, v, w in 2.30).
  const matrix: number[] = rotated
    ? [0, 0x10000, 0, -0x10000, 0, 0, 0, 0, 0x40000000]
    : [0x10000, 0, 0, 0, 0x10000, 0, 0, 0, 0x40000000];
  matrix.forEach((value: number, index: number): void => view.setInt32(40 + index * 4, value));
  view.setUint32(76, width * 65536);
  view.setUint32(80, height * 65536);
  return box('tkhd', payload);
}

/**
 * Function track
 *
 * @description
 * Builds a track with its header and handler type.
 *
 * @param {Uint8Array} header - Track header box.
 * @param {string} handlerType - `vide`, `soun`…
 * @returns {Uint8Array} Track box.
 */
function track(header: Uint8Array, handlerType: string): Uint8Array {
  const hdlr: Uint8Array = box('hdlr', new Uint8Array(8), ascii(handlerType), new Uint8Array(13));
  return box('trak', header, box('mdia', hdlr));
}

/**
 * Function mp4
 *
 * @description
 * Builds a file with an `ftyp` of the supplied brand followed by a `moov` of the supplied tracks.
 *
 * @param {string} brand - Major brand.
 * @param {...Uint8Array} tracks - Track boxes.
 * @returns {Uint8Array} File bytes.
 */
function mp4(brand: string, ...tracks: Uint8Array[]): Uint8Array {
  return new Uint8Array([
    ...box('ftyp', ascii(brand), new Uint8Array(4), ascii('isommp41')),
    ...box('moov', ...tracks),
  ]);
}

describe('Mp4VideoProbe', (): void => {
  const probe: Mp4VideoProbe = new Mp4VideoProbe();

  it('reads the display size of the first video track, after an audio track', (): void => {
    const file: Uint8Array = mp4('isom', track(tkhd(0, 0), 'soun'), track(tkhd(1280, 720), 'vide'));
    expect(probe.probe(file)).toEqual({ width: 1280, height: 720 });
  });

  it('swaps the size of a video turned by a quarter', (): void => {
    expect(probe.probe(mp4('mp42', track(tkhd(1920, 1080, true), 'vide')))).toEqual({
      width: 1080,
      height: 1920,
    });
  });

  it('leaves still images and other files to the image processor', (): void => {
    expect(probe.probe(mp4('avif', track(tkhd(800, 600), 'pict')))).toBeNull();
    expect(probe.probe(ascii('\u0089PNG\r\n'))).toBeNull();
    expect(probe.probe(new Uint8Array())).toBeNull();
  });

  it('refuses an MP4 without a readable video track', (): void => {
    expect((): unknown => probe.probe(mp4('isom', track(tkhd(0, 0), 'soun')))).toThrow(
      UnsupportedMediaError,
    );
    expect((): unknown => probe.probe(mp4('isom'))).toThrow(UnsupportedMediaError);
  });
});
