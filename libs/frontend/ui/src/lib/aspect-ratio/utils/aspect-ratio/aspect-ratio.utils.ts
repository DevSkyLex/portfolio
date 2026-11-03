import type { AspectRatioValue } from '@internal/ui/lib/aspect-ratio/models/aspect-ratio/aspect-ratio-value.type';

/**
 * Function parseAspectRatio
 *
 * @description
 * Converts a numeric or slash-separated ratio to a finite positive number. Invalid, non-finite, or
 * non-positive results use the square ratio fallback of 1.
 *
 * @param {AspectRatioValue} value - Ratio supplied by the directive input.
 *
 * @returns {number} Positive width-to-height ratio.
 */
export function parseAspectRatio(value: AspectRatioValue): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : 1;
  }
  const [width, height = '1'] = value.split('/');
  const ratio: number = Number(width) / Number(height);
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
}
