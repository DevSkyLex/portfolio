/**
 * Function projectPublicPath
 *
 * @description
 * Path of a project's public page in the admin's language: the localized static build serves the
 * French site at `/fr/` and the English one at `/en/`.
 *
 * @param {string} slug - Public slug of the project.
 * @param {string} localeId - `LOCALE_ID` of the running build.
 *
 * @returns {string} Root-relative path of the page.
 */
export function projectPublicPath(slug: string, localeId: string): string {
  return `/${localeId.toLowerCase().startsWith('en') ? 'en' : 'fr'}/projects/${slug}`;
}
