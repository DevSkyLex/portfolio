import type { SiteLocale } from '@vfortin/content-web-model';

/**
 * Function localizedUrl
 *
 * @description
 * Builds the absolute address of a public page under its locale prefix.
 *
 * @param {string} origin - Site origin without a trailing slash.
 * @param {SiteLocale} locale - Locale of the page.
 * @param {string} path - Locale-independent path starting with `/`, such as `/projects/movah`.
 *
 * @returns {string} Absolute address, with a trailing slash for the home page.
 */
export function localizedUrl(origin: string, locale: SiteLocale, path: string): string {
  return `${origin}/${locale}${path}`;
}
