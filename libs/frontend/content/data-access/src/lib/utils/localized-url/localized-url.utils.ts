import type { SiteLocale } from '@vfortin/content-web-model';

/**
 * Function localizedUrl
 *
 * @description
 * Builds the absolute address of a public page in one locale: French at the root, English under
 * `/en` (the localized static build, D7).
 *
 * @param {string} origin - Site origin without a trailing slash.
 * @param {SiteLocale} locale - Locale of the page.
 * @param {string} path - Locale-independent path starting with `/`, such as `/projects/movah`.
 *
 * @returns {string} Absolute address, `/en/` for the English home page.
 */
export function localizedUrl(origin: string, locale: SiteLocale, path: string): string {
  return `${origin}${locale === 'en' ? '/en' : ''}${path}`;
}
