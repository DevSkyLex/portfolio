import {
  SEO_DEFAULT_RANGE,
  SEO_RANGES,
  type SeoRange,
} from '@vfortin/content-web-data-access/admin';

/**
 * Function seoRangeParam
 *
 * @description
 * Value of the `?periode=` query parameter of a window (`7j`, `90j`), in the French spelling of the
 * admin's other list parameters (`?statut=`, `?tri=`); the default window writes none.
 *
 * @param {SeoRange} range - Window.
 *
 * @returns {string | null} Parameter value, `null` for the default window.
 */
export function seoRangeParam(range: SeoRange): string | null {
  return range === SEO_DEFAULT_RANGE ? null : range.replace('d', 'j');
}

/**
 * Function seoRangeFromParam
 *
 * @description
 * Window of a `?periode=` value; a missing or unknown value is the default window.
 *
 * @param {string | null} value - Parameter value.
 *
 * @returns {SeoRange} Window.
 */
export function seoRangeFromParam(value: string | null): SeoRange {
  return (
    SEO_RANGES.find((range: SeoRange): boolean => range.replace('d', 'j') === value) ??
    SEO_DEFAULT_RANGE
  );
}
