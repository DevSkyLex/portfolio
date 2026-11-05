import type { Language } from '@internal/web-shell/lib/layout/site-layout/models/language/language.type';

/**
 * Function localeUrl
 *
 * @description
 * Address of the same page under its locale prefix. The router URL is relative to the build's base
 * href, so adding the target prefix preserves the path, query and fragment.
 *
 * @param {string} url - Router URL, relative to the base href, with its query and fragment.
 * @param {Language} language - Target locale build.
 *
 * @returns {string} Absolute path of the page in that build.
 */
export const localeUrl = (url: string, language: Language): string => `/${language}${url}`;
