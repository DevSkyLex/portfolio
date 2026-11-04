import { API_PREFIX } from '@vfortin/web-http';

/**
 * Constant ADMIN_MEDIA_ENDPOINT
 *
 * @description
 * Same-origin administrator endpoint receiving one image upload per request (D40).
 *
 * @type {string}
 */
export const ADMIN_MEDIA_ENDPOINT: string = `${API_PREFIX}/content/admin/media`;

/**
 * Constant ADMIN_MEDIA_LIMITS
 *
 * @description
 * Browser copy of `MEDIA_UPLOAD_LIMITS` (`media.contract.ts`): the multipart field, the largest file and
 * the accepted types, checked before sending. The browser imports no value from the contracts (D10), so
 * this copy changes with the contract.
 */
export const ADMIN_MEDIA_LIMITS: {
  readonly field: 'file';
  readonly bytes: number;
  readonly types: readonly string[];
} = {
  field: 'file',
  bytes: 10 * 1024 * 1024,
  types: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
} as const;
