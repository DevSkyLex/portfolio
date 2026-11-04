import type { Language } from '@internal/web-shell/lib/layout/site-layout/models/language/language.type';

/**
 * Function localeUrl
 *
 * @description
 * Address of the same page in a locale build: the French build is served at `/`, the English one at
 * `/en/`. The router URL is relative to the build's base href, so the English address only adds the
 * `/en` prefix (`/admin/projects?statut=publie` becomes `/en/admin/projects?statut=publie`) and the
 * French one is the router URL itself.
 *
 * @param {string} url - Router URL, relative to the base href, with its query and fragment.
 * @param {Language} language - Target locale build.
 *
 * @returns {string} Absolute path of the page in that build.
 */
export const localeUrl = (url: string, language: Language): string =>
  language === 'en' ? `/en${url}` : url;
