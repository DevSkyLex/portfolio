import type { Rgb } from '@internal/content-web-ui/lib/models/rgb/rgb.type';
import type { Palette } from '@internal/content-web-ui/lib/timeline/models/palette/palette.interface';
import type { Span } from '@internal/content-web-ui/lib/timeline/models/span/span.interface';

/**
 * Constant clamp
 *
 * @description
 * Bounds a value inclusively between the supplied limits.
 */
export const clamp: (v: number, a: number, b: number) => number = (
  v: number,
  a: number,
  b: number,
): number => (v < a ? a : v > b ? b : v);

/**
 * Constant lerp
 *
 * @description
 * Interpolates from the first value to the second by the supplied fraction.
 */
export const lerp: (a: number, b: number, t: number) => number = (
  a: number,
  b: number,
  t: number,
): number => a + (b - a) * t;

/**
 * Function rnd
 *
 * @description
 * Creates a deterministic unit-interval sequence used to place the scene stars.
 *
 * @returns {() => number} Seeded generator that produces the same unit-interval sequence for a given seed.
 * @param {number} seed - Initial numeric seed converted to an unsigned 32-bit generator state.
 */
export function rnd(seed: number): () => number {
  let s: number = seed >>> 0;
  return (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Function hex
 *
 * @description
 * Parses three- or six-digit hexadecimal colour notation and returns the fallback for invalid input.
 *
 * @returns {Rgb} Parsed channels, or the supplied fallback when the input is invalid.
 * @param {string} value - Trimmed three- or six-digit hexadecimal colour text, with or without a leading hash.
 * @param {Rgb} fallback - RGB channels returned when `value` is not valid hexadecimal notation.
 */
export function hex(value: string, fallback: Rgb): Rgb {
  let h: string = value.trim().replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c: string): string => c + c)
      .join('');
  }
  if (!/^[0-9a-f]{6}$/i.test(h)) return fallback;
  const n: number = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Constant mix
 *
 * @description
 * Interpolates corresponding RGB channels using the timeline's linear interpolation rule.
 */
export const mix: (a: Rgb, b: Rgb, t: number) => Rgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

/**
 * Constant rgba
 *
 * @description
 * Formats RGB channels and a clamped alpha value for canvas fill styles.
 */
export const rgba: (c: Rgb, a?: number) => string = (c: Rgb, a: number = 1): string =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a, 0, 1).toFixed(3)})`;

/**
 * Function aurora
 *
 * @description
 * Samples the pink, violet, blue and cyan palette stops at normalized progress `t`.
 *
 * @returns {Rgb} Interpolated RGB colour at the clamped gradient position.
 * @param {Palette} p - Palette containing the pink, violet, blue and cyan gradient stops.
 * @param {number} t - Normalized position sampled along the aurora gradient; values outside `[0, 1]` are clamped.
 */
export function aurora(p: Palette, t: number): Rgb {
  t = clamp(t, 0, 1);
  if (t < 0.38) return mix(p.pink, p.violet, t / 0.38);
  if (t < 0.7) return mix(p.violet, p.blue, (t - 0.38) / 0.32);
  return mix(p.blue, p.cyan, (t - 0.7) / 0.3);
}

/**
 * Function timeSpan
 *
 * @description
 * Finds the scene bounds across all tracks and adds the entry and exit margins used by the animation.
 *
 * @returns {[number, number]} Scene bounds with entry and exit margins.
 * @param {readonly (readonly Span[])[]} tracks - Track groups whose span endpoints define the visible time axis.
 */
export function timeSpan(tracks: readonly (readonly Span[])[]): [number, number] {
  let t0: number = Infinity;
  let t1: number = -Infinity;
  for (const items of tracks) {
    for (const it of items) {
      t0 = Math.min(t0, it.a);
      t1 = Math.max(t1, it.b);
    }
  }
  return [t0 - 0.35, t1 + 0.15];
}

/**
 * Function activeStep
 *
 * @description
 * Returns the last step containing `t`, or `-1` when no step covers that instant.
 *
 * @returns {number} Last matching step index, or `-1` when no span contains the instant.
 * @param {readonly Span[]} items - Ordered spans to inspect; later matching spans take precedence when they overlap.
 * @param {number} t - Timeline instant tested against each span’s inclusive bounds.
 */
export function activeStep(items: readonly Span[], t: number): number {
  let on: number = -1;
  items.forEach((it: Span, k: number): void => {
    if (t >= it.a && t <= it.b) on = k;
  });
  return on;
}

/**
 * Constant sceneProgress
 *
 * @description
 * Converts a pinned section's position into clamped progress from 0 when its top reaches the viewport top
 * to 1 when its bottom reaches the viewport bottom, guarding against zero travel distance.
 */
export const sceneProgress: (top: number, height: number, viewport: number) => number = (
  top: number,
  height: number,
  viewport: number,
): number => clamp(-top / Math.max(1, height - viewport), 0, 1);

/**
 * Constant isLive
 *
 * @description
 * Enables scroll-following only when motion is allowed, the viewport is below 1600 pixels, and the page has
 * more than 40 pixels of scrollable height.
 */
export const isLive: (reduced: boolean, viewport: number, scrollHeight: number) => boolean = (
  reduced: boolean,
  viewport: number,
  scrollHeight: number,
): boolean => !reduced && scrollHeight > 0 && viewport < 1600 && scrollHeight - viewport > 40;

/**
 * Function smoothProgress
 *
 * @description
 * Smooths progress between nearby frames and snaps to the current value after initialization or a long pause.
 *
 * @returns {number} Smoothed progress, or the current value after initialization or a long pause.
 * @param {number | null} previous - Progress emitted by the preceding frame, or null before the first frame.
 * @param {number} p - Current target progress in the normalized scene range.
 * @param {number} dt - Elapsed seconds since the preceding frame; non-positive or greater-than-half-second intervals snap to the target.
 */
export function smoothProgress(previous: number | null, p: number, dt: number): number {
  if (previous === null || !(dt > 0) || dt > 0.5) return p;
  return previous + (p - previous) * (1 - Math.exp(-dt * 5));
}
