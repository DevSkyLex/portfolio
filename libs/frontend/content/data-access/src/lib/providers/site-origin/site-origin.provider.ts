import type { Provider } from '@angular/core';
import { DEFAULT_SITE_ORIGIN } from '@internal/content-web-data-access/lib/constants/site-origin.constants';
import { SITE_ORIGIN } from '@internal/content-web-data-access/lib/tokens/site-origin/site-origin.token';

/**
 * Function provideSiteOrigin
 *
 * @description
 * Registers the public origin used in absolute page addresses (D42).
 *
 * @param {string} origin - Scheme and host; a trailing slash is removed.
 *
 * @returns {Provider} Provider for the site origin token.
 */
export function provideSiteOrigin(origin: string = DEFAULT_SITE_ORIGIN): Provider {
  return { provide: SITE_ORIGIN, useValue: origin.replace(/\/+$/, '') };
}
