/**
 * Constant SEO_PREVIEW_SITE
 *
 * @description
 * Public site as a search result shows it: the site name appended to a project title without custom
 * search title, and the host of the breadcrumb URL (`https://valentin-fortin.pro`, French at `/`,
 * English at `/en/`).
 */
export const SEO_PREVIEW_SITE: { readonly name: string; readonly host: string } = {
  name: 'Valentin Fortin',
  host: 'valentin-fortin.pro',
} as const;
