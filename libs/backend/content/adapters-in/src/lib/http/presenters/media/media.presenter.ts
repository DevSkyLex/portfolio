import type { MediaRecord } from '@vfortin/content-application';
import type { MediaDto, PublicFigureDto, PublicImageDto } from '@vfortin/content-contracts';

/**
 * Function mediaSrc
 *
 * @description
 * Public URL of a media rendition, served at `/media/` by Nginx (or by the service in development).
 *
 * @param {string} id - Media identifier.
 * @param {string} suffix - Rendition suffix: empty for the full image, `-960` for the small one.
 * @returns {string} Root-relative URL.
 */
function mediaSrc(id: string, suffix: '' | '-960' = ''): string {
  return `/media/${id}${suffix}.webp`;
}

/**
 * Function toMediaDto
 *
 * @description
 * Presents a stored media to the administrator.
 *
 * @param {MediaRecord} record - Media row.
 * @returns {MediaDto} Media DTO.
 */
export function toMediaDto(record: MediaRecord): MediaDto {
  return {
    id: record.id,
    kind: record.kind,
    src: record.kind === 'video' ? videoSrc(record.id) : mediaSrc(record.id),
    width: record.width,
    height: record.height,
  };
}

/**
 * Function toPublicImage
 *
 * @description
 * Resolves a stored media for the public snapshot, with its 960 px rendition when it has one.
 *
 * @param {MediaRecord} record - Media row.
 * @returns {PublicImageDto} Public image.
 */
export function toPublicImage(record: MediaRecord): PublicImageDto {
  return {
    src: mediaSrc(record.id),
    small: record.hasSmall ? mediaSrc(record.id, '-960') : null,
    width: record.width,
    height: record.height,
  };
}

/**
 * Function videoSrc
 *
 * @description
 * Builds the public URL of the MP4 of a video (D57).
 *
 * @param {string} id - Media identifier.
 * @returns {string} Public URL.
 */
function videoSrc(id: string): string {
  return `/media/${id}.mp4`;
}

/**
 * Function toPublicFigure
 *
 * @description
 * Resolves a figure's media for the public snapshot: an image with its renditions, or a video (D57).
 *
 * @param {MediaRecord} record - Stored media.
 * @param {string} alt - Localized alternative text.
 * @param {string} caption - Localized caption.
 * @returns {PublicFigureDto} Public figure.
 */
export function toPublicFigure(record: MediaRecord, alt: string, caption: string): PublicFigureDto {
  return record.kind === 'video'
    ? {
        kind: 'video',
        src: videoSrc(record.id),
        small: null,
        width: record.width,
        height: record.height,
        alt,
        caption,
      }
    : { kind: 'image', ...toPublicImage(record), alt, caption };
}
