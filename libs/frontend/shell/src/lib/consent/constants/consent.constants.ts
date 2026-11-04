/**
 * Constant CONSENT_STORAGE_KEY
 *
 * @description
 * `localStorage` key of the visitor's cookie choice (D48), beside the theme preference.
 *
 * @type {string}
 */
export const CONSENT_STORAGE_KEY = 'cookie-consent' as const;

/**
 * Constant CONSENT_VERSION
 *
 * @description
 * Version of the stored record; raising it asks every visitor again (a new purpose, a new provider).
 *
 * @type {number}
 */
export const CONSENT_VERSION = 1 as const;

/**
 * Constant CONSENT_LIFETIME_MONTHS
 *
 * @description
 * Months a choice is kept before it is asked again, as the CNIL recommends for a refusal (and applied
 * to an acceptance too).
 *
 * @type {number}
 */
export const CONSENT_LIFETIME_MONTHS = 6 as const;

/**
 * Constant GA4_MEASUREMENT_ID
 *
 * @description
 * Shape of a GA4 measurement id; anything else leaves the measurement off.
 *
 * @type {RegExp}
 */
export const GA4_MEASUREMENT_ID: RegExp = /^G-[A-Z0-9]{4,16}$/;
