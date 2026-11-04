import { type ProcessedImage, UnsupportedMediaError } from '@vfortin/content-application';
import { crc32 } from 'node:zlib';
import sharp, { type Metadata, type Sharp } from 'sharp';
import {
  MAX_PIXELS,
  SharpImageProcessor,
} from '@internal/content-adapters-out/lib/media/sharp-image/sharp-image.processor';

/**
 * Function image
 *
 * @description
 * Creates a plain image of the given size.
 *
 * @param {number} width - Width in pixels.
 * @param {number} height - Height in pixels.
 * @returns {Sharp} Image pipeline to encode.
 */
const image = (width: number, height: number): Sharp =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 40, b: 40 } } });

describe('SharpImageProcessor', (): void => {
  const processor: SharpImageProcessor = new SharpImageProcessor();

  it('applies the EXIF orientation and keeps no metadata', async (): Promise<void> => {
    const jpeg: Buffer = await image(300, 200)
      .jpeg()
      .withMetadata({ orientation: 6, exif: { IFD0: { Copyright: 'Valentin' } } })
      .toBuffer();
    expect((await sharp(jpeg).metadata()).orientation).toBe(6);
    const processed: ProcessedImage = await processor.process(jpeg);
    expect([processed.width, processed.height]).toEqual([200, 300]);
    expect(processed.small).toBeNull();
    const output: Metadata = await sharp(processed.full).metadata();
    expect(output).toMatchObject({ format: 'webp', width: 200, height: 300 });
    expect([output.orientation, output.exif, output.icc, output.xmp]).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('caps the width at 2400 px and adds a 960 px rendition to wide images', async (): Promise<void> => {
    const processed: ProcessedImage = await processor.process(
      await image(3000, 1000).png().toBuffer(),
    );
    expect([processed.width, processed.height]).toEqual([2400, 800]);
    expect(processed.small).not.toBeNull();
    await expect(sharp(processed.small ?? undefined).metadata()).resolves.toMatchObject({
      format: 'webp',
      width: 960,
      height: 320,
    });
  });

  it('never enlarges, and adds no rendition up to 960 px', async (): Promise<void> => {
    const processed: ProcessedImage = await processor.process(
      await image(960, 400).webp().toBuffer(),
    );
    expect([processed.width, processed.height, processed.small]).toEqual([960, 400, null]);
  });

  it.each([
    ['AVIF', (): Promise<Buffer> => image(64, 48).avif().toBuffer()],
    ['GIF', (): Promise<Buffer> => image(64, 48).gif().toBuffer()],
  ])('accepts %s', async (_format, encode): Promise<void> => {
    await expect(processor.process(await encode())).resolves.toMatchObject({
      width: 64,
      height: 48,
    });
  });

  it.each([
    [
      'SVG',
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
      ),
    ],
    ['text', Buffer.from('plain text, not an image')],
    ['a truncated JPEG', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00])],
  ])('refuses %s', async (_label, bytes): Promise<void> => {
    await expect(processor.process(bytes)).rejects.toBeInstanceOf(UnsupportedMediaError);
  });

  it('refuses an image above 50 megapixels before decoding it', async (): Promise<void> => {
    // A tiny PNG whose header claims 8000 × 7000 pixels: only the header check can refuse it.
    const png: Buffer = await image(8, 8).png().toBuffer();
    png.writeUInt32BE(8000, 16);
    png.writeUInt32BE(7000, 20);
    png.writeUInt32BE(crc32(png.subarray(12, 29)), 29);
    await expect(sharp(png).metadata()).resolves.toMatchObject({ width: 8000, height: 7000 });
    await expect(processor.process(png)).rejects.toThrow(
      new UnsupportedMediaError('The image exceeds 50 megapixels.'),
    );
  });

  it('refuses an image above the decoder pixel limit even if its header was not checked', async (): Promise<void> => {
    const png: Buffer = await image(8, 8).png().toBuffer();
    png.writeUInt32BE(8000, 16);
    png.writeUInt32BE(7000, 20);
    png.writeUInt32BE(crc32(png.subarray(12, 29)), 29);
    await expect(sharp(png, { limitInputPixels: MAX_PIXELS }).webp().toBuffer()).rejects.toThrow(
      /pixel limit/,
    );
  });
});
