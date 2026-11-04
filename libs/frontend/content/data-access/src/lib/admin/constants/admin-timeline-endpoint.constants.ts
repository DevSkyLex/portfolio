import { API_PREFIX } from '@vfortin/web-http';

/**
 * Constant ADMIN_TIMELINE_ENDPOINT
 *
 * @description
 * Same-origin administrator endpoint of the timeline lists, followed by `/<kind>/entries`.
 *
 * @type {string}
 */
export const ADMIN_TIMELINE_ENDPOINT: string = `${API_PREFIX}/content/admin/timeline`;
