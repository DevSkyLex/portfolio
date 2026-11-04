import type { PanelPixels } from '@internal/ui/lib/resizable/models/resizable/panel-pixels.interface';
import type { PanelRange } from '@internal/ui/lib/resizable/models/resizable/panel-range.interface';
import type { PanelSize } from '@internal/ui/lib/resizable/models/resizable/panel-size.type';
import type { ResizableLayout } from '@internal/ui/lib/resizable/models/resizable/resizable-layout.interface';

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
 * Function pixelsOf
 *
 * @description
 * Reads the pixel length of a `'<n>px'` panel size.
 *
 * @param {PanelSize | undefined} size - Panel size or bound.
 * @returns {number | undefined} Length in pixels, or `undefined` for a percentage or no size.
 */
export function pixelsOf(size: PanelSize | undefined): number | undefined {
  if (typeof size !== 'string') return undefined;
  const value: number = Number.parseFloat(size);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Function percentOf
 *
 * @description
 * Converts a panel size to a percentage of a group of the given length.
 *
 * @param {PanelSize | undefined} size - Percentage, `'<n>px'` length or nothing.
 * @param {number} extent - Measured length of the group along its axis, `0` before measuring.
 * @returns {number | undefined} Percentage, or `undefined` for no size or pixels before measuring.
 */
export function percentOf(size: PanelSize | undefined, extent: number): number | undefined {
  if (typeof size === 'number') return size;
  const pixels: number | undefined = pixelsOf(size);
  return pixels === undefined || extent <= 0 ? undefined : (pixels / extent) * 100;
}

/**
 * Function panelRange
 *
 * @description
 * Resolves a panel's bounds to percentages; pixel bounds stay open (0 to 100) until the group has a
 * measured length, and the maximum never falls below the minimum.
 *
 * @param {PanelSize} min - Lower bound.
 * @param {PanelSize} max - Upper bound.
 * @param {number} extent - Measured length of the group, `0` before measuring.
 * @returns {PanelRange} Bounds in percent.
 */
export function panelRange(min: PanelSize, max: PanelSize, extent: number): PanelRange {
  const lower: number = clamp(percentOf(min, extent) ?? 0, 0, 100);
  return { min: lower, max: clamp(percentOf(max, extent) ?? 100, lower, 100) };
}

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
 * Function fitPanelSizes
 *
 * @description
 * Gives each panel with a target its target within its bounds, then shares what remains among the
 * other panels in proportion to their current sizes. A group of pinned panels only is normalized to
 * 100 percent.
 *
 * @param {readonly number[]} sizes - Current panel percentages.
 * @param {readonly (number | undefined)[]} targets - Percentage requested per panel, if any.
 * @param {readonly PanelRange[]} ranges - Bounds of each panel in percent.
 * @returns {number[]} Fitted panel percentages.
 */
export function fitPanelSizes(
  sizes: readonly number[],
  targets: readonly (number | undefined)[],
  ranges: readonly PanelRange[],
): number[] {
  const pinned: (number | undefined)[] = targets.map(
    (target: number | undefined, index: number): number | undefined =>
      target === undefined
        ? undefined
        : clamp(target, ranges[index]?.min ?? 0, ranges[index]?.max ?? 100),
  );
  const taken: number = pinned.reduce<number>((sum, size) => sum + (size ?? 0), 0);
  const free: number[] = sizes
    .map((_size: number, index: number): number => index)
    .filter((index: number): boolean => pinned[index] === undefined);
  if (!free.length) {
    return taken ? pinned.map((size) => ((size ?? 0) / taken) * 100) : [...sizes];
  }
  const remaining: number = Math.max(0, 100 - taken);
  const freeTotal: number = free.reduce(
    (sum: number, index: number) => sum + (sizes[index] ?? 0),
    0,
  );
  return sizes.map(
    (size: number, index: number): number =>
      pinned[index] ?? (freeTotal > 0 ? (size / freeTotal) * remaining : remaining / free.length),
  );
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
 * @param {readonly PanelRange[]} limits - Per-panel minimum and maximum percentages.
 * @returns {number[]} New panel sizes, or a copy of the current sizes if the pair is unavailable.
 */
export function resizePanels(
  sizes: readonly number[],
  index: number,
  delta: number,
  limits: readonly PanelRange[],
): number[] {
  const before: number | undefined = sizes[index];
  const after: number | undefined = sizes[index + 1];
  const range: PanelRange | undefined = boundaryRange(sizes, index, limits);
  if (before === undefined || after === undefined || !range) {
    return [...sizes];
  }
  const pair: number = before + after;
  const next: number = clamp(before + delta, range.min, range.max);
  const result: number[] = [...sizes];
  result[index] = next;
  result[index + 1] = pair - next;
  return result;
}

/**
 * Function boundaryRange
 *
 * @description
 * Range the panel before a boundary can take while both neighbours respect their bounds: the
 * splitter's `aria-valuemin` and `aria-valuemax`.
 *
 * @param {readonly number[]} sizes - Current panel percentages.
 * @param {number} index - Index of the panel before the boundary.
 * @param {readonly PanelRange[]} limits - Per-panel bounds in percent.
 * @returns {PanelRange | undefined} Reachable range, or `undefined` without a pair.
 */
export function boundaryRange(
  sizes: readonly number[],
  index: number,
  limits: readonly PanelRange[],
): PanelRange | undefined {
  const before: number | undefined = sizes[index];
  const after: number | undefined = sizes[index + 1];
  const beforeLimits: PanelRange | undefined = limits[index];
  const afterLimits: PanelRange | undefined = limits[index + 1];
  if (before === undefined || after === undefined || !beforeLimits || !afterLimits) {
    return undefined;
  }
  const pair: number = before + after;
  const min: number = Math.max(beforeLimits.min, pair - afterLimits.max);
  return { min, max: Math.max(min, Math.min(beforeLimits.max, pair - afterLimits.min)) };
}

/**
 * Constant STORED_LAYOUT_TOLERANCE
 *
 * @description
 * Slack, in percentage points, accepted on a stored layout's bounds and total: drags produce
 * fractional sizes, so a valid layout never sums to exactly 100.
 *
 * @type {number}
 */
const STORED_LAYOUT_TOLERANCE: number = 0.5;

/**
 * Function storedPanelSizes
 *
 * @description
 * Reads a layout saved as a JSON array of percentages and keeps it only when it has one finite
 * number per panel, each within that panel's percentage limits (pixel limits wait for a measured
 * group), summing to about 100.
 *
 * @param {string | null} raw - Stored value, `null` when nothing is stored.
 * @param {ResizableLayout} layout - Defaults and bounds of the group.
 * @returns {readonly number[]} Stored sizes, or the layout's defaults for a missing or invalid value.
 */
export function storedPanelSizes(raw: string | null, layout: ResizableLayout): readonly number[] {
  if (raw === null) return layout.sizes;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return layout.sizes;
  }
  if (!Array.isArray(value) || value.length !== layout.sizes.length) return layout.sizes;
  const sizes: unknown[] = value;
  const valid: boolean = sizes.every((size: unknown, index: number): boolean => {
    const range: PanelRange = panelRange(
      layout.limits[index]?.min ?? 0,
      layout.limits[index]?.max ?? 100,
      0,
    );
    return (
      typeof size === 'number' &&
      Number.isFinite(size) &&
      size >= range.min - STORED_LAYOUT_TOLERANCE &&
      size <= range.max + STORED_LAYOUT_TOLERANCE
    );
  });
  if (!valid) return layout.sizes;
  const numbers: number[] = sizes as number[];
  const total: number = numbers.reduce((sum: number, size: number): number => sum + size, 0);
  return Math.abs(total - 100) <= STORED_LAYOUT_TOLERANCE ? numbers : layout.sizes;
}

/**
 * Function storedPanelPixels
 *
 * @description
 * Reads a panel length saved as a JSON number of pixels and keeps it only within that panel's pixel
 * bounds. Anything else, such as a percentage layout saved before (`[16,84]`), gives the default.
 *
 * @param {string | null} raw - Stored value, `null` when nothing is stored.
 * @param {ResizableLayout} layout - Bounds of the group's panels.
 * @param {PanelPixels} pixels - Panel remembered in pixels and its default.
 * @returns {number} Stored length, or the default for a missing, invalid or out-of-bounds value.
 */
export function storedPanelPixels(
  raw: string | null,
  layout: ResizableLayout,
  pixels: PanelPixels,
): number {
  if (raw === null) return pixels.default;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return pixels.default;
  }
  const min: number = pixelsOf(layout.limits[pixels.index]?.min) ?? 0;
  const max: number = pixelsOf(layout.limits[pixels.index]?.max) ?? Number.POSITIVE_INFINITY;
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
    ? value
    : pixels.default;
}
