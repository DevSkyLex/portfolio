import { imageFileError } from '@internal/content-web-feature-admin/lib/utils/image-file/image-file.utils';

/**
 * Function file
 *
 * @description
 * Builds a file of the supplied type whose reported size is `size` bytes, without allocating it.
 *
 * @param {string} name - File name.
 * @param {string} type - Media type.
 * @param {number} size - Reported size in bytes.
 *
 * @returns {File} Candidate file.
 */
function file(name: string, type: string, size: number = 10): File {
  const candidate: File = new File(['x'], name, { type });
  Object.defineProperty(candidate, 'size', { value: size });
  return candidate;
}

describe('imageFileError', (): void => {
  it('accepts an image and refuses a video where only images go (a cover)', (): void => {
    expect(imageFileError(file('photo.png', 'image/png'))).toBeNull();
    expect(imageFileError(file('demo.mp4', 'video/mp4'))).toContain('n’est pas une image acceptée');
  });

  it('accepts an MP4 up to 50 MB in an article figure (D57)', (): void => {
    expect(imageFileError(file('demo.mp4', 'video/mp4', 50 * 1024 * 1024), true)).toBeNull();
    expect(imageFileError(file('demo.mp4', 'video/mp4', 50 * 1024 * 1024 + 1), true)).toBe(
      '« demo.mp4 » dépasse 50 Mo.',
    );
    expect(imageFileError(file('clip.webm', 'video/webm'), true)).toContain(
      'n’est ni une image ni une vidéo acceptée',
    );
    expect(imageFileError(file('photo.png', 'image/png', 10 * 1024 * 1024 + 1), true)).toBe(
      '« photo.png » dépasse 10 Mo.',
    );
  });
});
