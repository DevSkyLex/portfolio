import { API_PREFIX } from '@vfortin/web-http';

/**
 * Constant ADMIN_MESSAGES_URL
 *
 * @description
 * Same-origin collection endpoint used by inbox operations.
 *
 * @type {string}
 */
export const ADMIN_MESSAGES_URL: '/api/contact/admin/messages' = `${API_PREFIX}/contact/admin/messages`;

/**
 * Constant INBOX_PAGE_SIZE
 *
 * @description
 * Requested message count per inbox page, matching the API's supported pagination size.
 *
 * @type {number}
 */
export const INBOX_PAGE_SIZE = 20 as const;
