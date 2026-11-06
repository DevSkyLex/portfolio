import type { SeoTab } from '@internal/content-web-feature-admin/lib/models/seo-tab/seo-tab.type';

/**
 * Constant SEO_TABS
 *
 * @description
 * Tabs of the dashboard in display order; the first one opens without a query parameter.
 *
 * @type {readonly SeoTab[]}
 */
export const SEO_TABS: readonly SeoTab[] = ['search-console', 'audience', 'vitals', 'audit'];

/**
 * Function seoTabParam
 *
 * @description
 * Value of `?onglet=` for a tab: none for the first one, so that the plain address opens it.
 *
 * @param {SeoTab} tab - Tab shown.
 * @returns {string | null} Parameter value, or `null` to drop the parameter.
 */
export function seoTabParam(tab: SeoTab): string | null {
  return tab === SEO_TABS[0] ? null : tab;
}

/**
 * Function seoTabFromParam
 *
 * @description
 * Tab named by `?onglet=`; a missing or unknown value opens the first one.
 *
 * @param {string | null} value - Parameter value.
 * @returns {SeoTab} Tab to show.
 */
export function seoTabFromParam(value: string | null): SeoTab {
  return SEO_TABS.find((tab: SeoTab): boolean => tab === value) ?? 'search-console';
}
