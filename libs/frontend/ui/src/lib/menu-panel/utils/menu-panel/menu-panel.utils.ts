import type { ConnectedPosition } from '@angular/cdk/overlay';

/**
 * Function panelPositions
 *
 * @description
 * Returns bottom-first overlay positions separated from the origin by four pixels, with a top fallback when space is short.
 *
 * @param {'start' | 'end'} align - Horizontal alignment shared by origin and overlay, defaulting to `start`.
 * @returns {ConnectedPosition[]} Preferred and fallback CDK overlay positions.
 */
export const panelPositions = (align: 'start' | 'end' = 'start'): ConnectedPosition[] => [
  { originX: align, originY: 'bottom', overlayX: align, overlayY: 'top', offsetY: 4 },
  { originX: align, originY: 'top', overlayX: align, overlayY: 'bottom', offsetY: -4 },
];

/**
 * Function normalizeText
 *
 * @description
 * Removes diacritics, lowercases and trims a label before menu typeahead comparison.
 *
 * @param {string} text - Label to normalize.
 * @returns {string} Searchable normalized text.
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Function stepItem
 *
 * @description
 * Selects the first, last or adjacent enabled item, skipping disabled entries and returning `null` when none are enabled.
 *
 * @template T - Item type exposing its disabled state.
 * @param {readonly T[]} items - Items in rendered order.
 * @param {T | null} current - Current item, or `null` when no item is active.
 * @param {1 | -1 | 'first' | 'last'} step - Navigation direction or endpoint request.
 * @returns {T | null} Destination enabled item, or `null` for an empty enabled set.
 */
export function stepItem<T extends { isDisabled(): boolean }>(
  items: readonly T[],
  current: T | null,
  step: 1 | -1 | 'first' | 'last',
): T | null {
  const enabled: T[] = items.filter((item) => !item.isDisabled());
  if (!enabled.length) return null;
  const last: number = enabled.length - 1;
  const index: number = current ? enabled.indexOf(current) : -1;
  if (step === 'first' || (index === -1 && step === 1)) return enabled[0] ?? null;
  if (step === 'last' || index === -1) return enabled[last] ?? null;
  return enabled[Math.min(Math.max(index + step, 0), last)] ?? null;
}
