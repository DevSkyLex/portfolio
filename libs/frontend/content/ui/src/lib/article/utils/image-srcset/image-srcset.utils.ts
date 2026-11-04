import type { ProjectImage } from '@vfortin/content-web-model';

/**
 * Function imageSrcset
 *
 * @description
 * Lists the renditions of an uploaded image (D40) for `srcset`: the 960 px WebP, then the full one at
 * its intrinsic width.
 *
 * @param {ProjectImage} image - Uploaded image.
 *
 * @returns {string | null} Candidate list, or `null` when the image has no 960 px rendition and `src`
 * alone describes it.
 */
export function imageSrcset(image: ProjectImage): string | null {
  return image.small === null ? null : `${image.small} 960w, ${image.src} ${image.width}w`;
}
