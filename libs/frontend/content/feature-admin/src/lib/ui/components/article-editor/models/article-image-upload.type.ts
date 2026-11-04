import type { AdminMedia } from '@vfortin/content-web-data-access/admin';

/**
 * Type ArticleImageUpload
 * @type ArticleImageUpload
 *
 * @description
 * Upload supplied by the page: stores one image and resolves to the media the figure references, or
 * rejects with an `Error` whose message the editor shows.
 */
export type ArticleImageUpload = (file: File) => Promise<AdminMedia>;
