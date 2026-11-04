/**
 * Constant GTAG_SCRIPT_URL
 *
 * @description
 * Google tag script, created by the bundle only after consent (no inline script, D20, D48); the CSP
 * allows its origin in `script-src`.
 *
 * @type {string}
 */
export const GTAG_SCRIPT_URL = 'https://www.googletagmanager.com/gtag/js' as const;

/**
 * Constant GA_COOKIE_LIFETIME_SECONDS
 *
 * @description
 * Lifetime of the `_ga` cookies: 13 months of 30 days, the CNIL maximum for an audience cookie.
 *
 * @type {number}
 */
export const GA_COOKIE_LIFETIME_SECONDS: number = 13 * 30 * 24 * 60 * 60;

/**
 * Constant GA_COOKIE
 *
 * @description
 * Names of the Google Analytics cookies (`_ga`, `_ga_<container>`), deleted on withdrawal.
 *
 * @type {RegExp}
 */
export const GA_COOKIE: RegExp = /^_ga/;

/**
 * Constant UNMEASURED_PATH
 *
 * @description
 * Paths never reported as page views: the administration, in both locales.
 *
 * @type {RegExp}
 */
export const UNMEASURED_PATH: RegExp = /^\/(?:en\/)?admin(?:\/|$)/;
