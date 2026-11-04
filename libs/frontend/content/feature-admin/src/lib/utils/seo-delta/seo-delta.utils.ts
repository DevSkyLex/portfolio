import type { SeoDelta } from '@internal/content-web-feature-admin/lib/models/seo-delta/seo-delta.interface';
import type { SeoFormatter } from '@internal/content-web-feature-admin/lib/models/seo-formatter/seo-formatter.interface';

/**
 * Function relativeDelta
 *
 * @description
 * Relative change of a figure where more is better (clicks, users) or worse, as a signed
 * percentage. Without a previous value there is nothing to compare: `null`. A change under 0.05 %
 * is flat.
 *
 * @param {number} current - Figure of the window.
 * @param {number} previous - Figure of the period before.
 * @param {SeoFormatter} format - Locale formatters.
 * @param {'higher' | 'lower'} better - Which way is good for the site.
 *
 * @returns {SeoDelta | null} Change, or `null` when the period before is zero.
 */
export function relativeDelta(
  current: number,
  previous: number,
  format: SeoFormatter,
  better: 'higher' | 'lower' = 'higher',
): SeoDelta | null {
  if (previous <= 0) return null;
  const change: number = (current - previous) / previous;
  return delta(change, Math.abs(change) < 0.0005, format.signedPercent(change), better);
}

/**
 * Function positionDelta
 *
 * @description
 * Change of the average search position, in positions: lower is better, and a position of 0 means
 * no impression, so either period at 0 gives `null`. A change under 0.05 is flat.
 *
 * @param {number} current - Average position of the window.
 * @param {number} previous - Average position of the period before.
 * @param {SeoFormatter} format - Locale formatters.
 *
 * @returns {SeoDelta | null} Change, or `null` without impressions in either period.
 */
export function positionDelta(
  current: number,
  previous: number,
  format: SeoFormatter,
): SeoDelta | null {
  if (current <= 0 || previous <= 0) return null;
  const change: number = current - previous;
  return delta(change, Math.abs(change) < 0.05, format.signedDecimal(change), 'lower');
}

/**
 * Function delta
 *
 * @description
 * Direction and tone of a signed change.
 *
 * @param {number} change - Signed change.
 * @param {boolean} flat - Whether the change is too small to count.
 * @param {string} display - Formatted change.
 * @param {'higher' | 'lower'} better - Which way is good.
 *
 * @returns {SeoDelta} Change.
 */
function delta(
  change: number,
  flat: boolean,
  display: string,
  better: 'higher' | 'lower',
): SeoDelta {
  if (flat) return { display, direction: 'flat', tone: 'flat' };
  const direction: 'up' | 'down' = change > 0 ? 'up' : 'down';
  return {
    display,
    direction,
    tone: (direction === 'up') === (better === 'higher') ? 'good' : 'bad',
  };
}
