/**
 * Function projectPublicPath
 *
 * @description
 * Canonical article path of a publication in the administration's language.
 *
 * @param {string} slug - Public slug of the project.
 * @param {string} localeId - `LOCALE_ID` of the running build.
 *
 * @returns {string} Root-relative path of the page.
 */
export function projectPublicPath(slug: string, localeId: string): string {
  return `/${localeId.toLowerCase().startsWith('en') ? 'en' : 'fr'}/articles/${slug}`;
}
