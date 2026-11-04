import type { SeoRange } from '@internal/content-web-data-access/lib/admin/models/seo-dashboard/seo-dashboard.type';

/**
 * Constant SEO_RANGES
 *
 * @description
 * Browser copy of the contract's report windows (`SEO_DASHBOARD_RANGES`), shortest first: the
 * browser bundle carries no contract value (D10).
 *
 * @type {readonly SeoRange[]}
 */
export const SEO_RANGES: readonly SeoRange[] = ['7d', '28d', '90d'];

/**
 * Constant SEO_DEFAULT_RANGE
 *
 * @description
 * Window the API answers without `?range=` (`SEO_DASHBOARD_DEFAULT_RANGE`).
 *
 * @type {SeoRange}
 */
export const SEO_DEFAULT_RANGE: SeoRange = '28d';

/**
 * Constant SEO_REFRESH_TOO_SOON
 *
 * @description
 * Problem code of a refresh asked within 10 minutes of the previous start
 * (`SEO_DASHBOARD_ERROR_CODES.refreshTooSoon`).
 *
 * @type {string}
 */
export const SEO_REFRESH_TOO_SOON: string = 'content.seo-refresh-too-soon';

/**
 * Constant SEO_REFRESH_POLL_MS
 *
 * @description
 * Delay between two reads while a refresh runs in the background: Google takes longer than the
 * edge's proxy timeout, so the page polls until `refresh.running` is false (D47).
 *
 * @type {number}
 */
export const SEO_REFRESH_POLL_MS: number = 3000;
