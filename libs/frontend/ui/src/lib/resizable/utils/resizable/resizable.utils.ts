import type { PanelLimits } from '@internal/ui/lib/resizable/models/resizable/panel-limits.interface';

/**
 * Function clamp
 *
 * @description
 * Restricts a numeric value to the inclusive minimum and maximum bounds.
 *
 * @param {number} value - Candidate value.
 * @param {number} min - Inclusive lower bound.
 * @param {number} max - Inclusive upper bound.
 * @returns {number} Value within the supplied bounds.
 */
const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Function initialPanelSizes
 *
 * @description
 * Keeps specified panel sizes and divides the remaining group size evenly among unspecified panels.
 * Normalizes nonempty results to 100 percent.
 *
 * @param {readonly (number | undefined)[]} defaults - Optional requested size for each panel.
 * @returns {number[]} Initial panel percentages in input order.
 */
export function initialPanelSizes(defaults: readonly (number | undefined)[]): number[] {
  const fixed: number = defaults.reduce<number>(
    (sum: number, size: number | undefined): number => sum + (size ?? 0),
    0,
  );
  const free: number = defaults.filter(
    (size: number | undefined): size is undefined => size === undefined,
  ).length;
  const share: number = free ? Math.max(0, 100 - fixed) / free : 0;
  const sizes: number[] = defaults.map((size: number | undefined): number => size ?? share);
  const total: number = sizes.reduce((sum: number, size: number): number => sum + size, 0);
  return total ? sizes.map((size: number): number => (size / total) * 100) : sizes;
}

/**
 * Function resizePanels
 *
 * @description
 * Moves the boundary after one panel by transferring space between its adjacent panels while
 * respecting both sets of limits; all other panels retain their sizes.
 *
 * @param {readonly number[]} sizes - Current panel sizes as percentages.
 * @param {number} index - Index of the panel before the boundary.
 * @param {number} delta - Requested size change in percentage points.
 * @param {readonly PanelLimits[]} limits - Per-panel minimum and maximum percentages.
 * @returns {number[]} New panel sizes, or a copy of the current sizes if the pair is unavailable.
 */
export function resizePanels(
  sizes: readonly number[],
  index: number,
  delta: number,
  limits: readonly PanelLimits[],
): number[] {
  const before: number | undefined = sizes[index];
  const after: number | undefined = sizes[index + 1];
  const beforeLimits: PanelLimits | undefined = limits[index];
  const afterLimits: PanelLimits | undefined = limits[index + 1];
  if (before === undefined || after === undefined || !beforeLimits || !afterLimits) {
    return [...sizes];
  }
  const pair: number = before + after;
  const next: number = clamp(
    before + delta,
    Math.max(beforeLimits.min, pair - afterLimits.max),
    Math.min(beforeLimits.max, pair - afterLimits.min),
  );
  const result: number[] = [...sizes];
  result[index] = next;
  result[index + 1] = pair - next;
  return result;
}
