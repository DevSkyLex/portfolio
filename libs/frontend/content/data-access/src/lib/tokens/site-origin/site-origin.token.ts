import { InjectionToken } from '@angular/core';
import { DEFAULT_SITE_ORIGIN } from '@internal/content-web-data-access/lib/constants/site-origin.constants';

/**
 * Constant SITE_ORIGIN
 *
 * @description
 * Public origin of the site, without a trailing slash, from which the canonical, alternate, Open Graph
 * and JSON-LD addresses are built (D42). The web shell provides it through `provideSiteOrigin`; the
 * root default keeps isolated tests and hosts working with the production origin.
 *
 * @type {InjectionToken<string>}
 */
export const SITE_ORIGIN: InjectionToken<string> = new InjectionToken<string>('SITE_ORIGIN', {
  providedIn: 'root',
  factory: (): string => DEFAULT_SITE_ORIGIN,
});
