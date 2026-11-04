import { z } from 'zod/mini';

/**
 * Constant MEDIA_UPLOAD_LIMITS
 *
 * @description
 * Upload bounds of the administrator media endpoint (D40): the multipart field name, the largest file
 * accepted and the formats decoded before re-encoding to WebP.
 */
export const MEDIA_UPLOAD_LIMITS = {
  field: 'file',
  bytes: 10 * 1024 * 1024,
  types: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
} as const;

/**
 * Constant MediaDtoSchema
 *
 * @description
 * Uploaded image as the administrator sees it: its id, the URL of its full WebP and its intrinsic size.
 */
export const MediaDtoSchema = z.object({
  id: z.uuid(),
  src: z.string().check(z.regex(/^\/media\/[0-9a-f-]{36}\.webp$/)),
  width: z.int().check(z.positive()),
  height: z.int().check(z.positive()),
});

/**
 * Type MediaDto
 * @type MediaDto
 *
 * @description
 * Response of a media upload, also listed with each administrator project for the media it references.
 */
export type MediaDto = z.infer<typeof MediaDtoSchema>;

/**
 * Constant MEDIA_ERROR_CODES
 *
 * @description
 * Stable problem codes of the media upload and of revisions referencing media.
 */
export const MEDIA_ERROR_CODES = {
  missing: 'content.media-missing',
  tooLarge: 'content.media-too-large',
  unsupported: 'content.media-unsupported',
  notFound: 'content.media-not-found',
} as const;
