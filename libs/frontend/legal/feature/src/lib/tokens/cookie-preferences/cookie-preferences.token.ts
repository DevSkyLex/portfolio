import { InjectionToken } from '@angular/core';
import type { CookiePreferences } from '@internal/legal-web-feature/lib/models/cookie-preferences/cookie-preferences.interface';

/**
 * Constant COOKIE_PREFERENCES
 *
 * @description
 * Cookie preferences of the site, provided by the shell (D48); without it the privacy page shows no
 * « Gérer les cookies » button.
 */
export const COOKIE_PREFERENCES: InjectionToken<CookiePreferences> =
  new InjectionToken<CookiePreferences>('COOKIE_PREFERENCES');
