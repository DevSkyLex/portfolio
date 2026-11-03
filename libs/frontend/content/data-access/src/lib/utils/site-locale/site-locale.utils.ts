import type { SiteLocale } from '@vfortin/content-web-model';

/**
 * Function localeOf
 *
 * @description
 * Resolves Angular's locale identifier to one of the site's supported locale keys.
 *
 * @param {string} id - Locale identifier supplied by Angular.
 *
 * @returns {SiteLocale} English for identifiers beginning with `en`, French otherwise.
 */
export const localeOf: (id: string) => SiteLocale = (id: string): SiteLocale =>
  id.startsWith('en') ? 'en' : 'fr';
