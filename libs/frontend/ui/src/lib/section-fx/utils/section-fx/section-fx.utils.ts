/**
 * Function smoothstep
 * @function smoothstep
 *
 * @description
 * Clamps a normalized position and applies the cubic smoothstep curve used for section entry and exit.
 *
 * @param {number} value - Unbounded normalized position.
 * @returns {number} Smoothed position within `[0, 1]`.
 */
export const smoothstep = (value: number): number => {
  const x: number = Math.min(1, Math.max(0, value));
  return x * x * (3 - 2 * x);
};

/**
 * Function sectionProgress
 * @function sectionProgress
 *
 * @description
 * Computes eased entry and exit phases from the section's viewport-relative edges. Entry completes as the top
 * crosses the lower 55 percent of the viewport; exit starts as the bottom crosses upward through 40 percent height
 * and completes when the bottom reaches the viewport top.
 *
 * @param {{ top: number; bottom: number }} rect - Section edges relative to the viewport, in CSS pixels.
 * @param {number} vh - Viewport height in CSS pixels.
 * @returns {{ in: number; out: number }} Clamped eased entry and exit progress values.
 */
export function sectionProgress(
  rect: { top: number; bottom: number },
  vh: number,
): { in: number; out: number } {
  return {
    in: smoothstep((vh - rect.top) / (vh * 0.55)),
    out: smoothstep((vh * 0.4 - rect.bottom) / (vh * 0.4)),
  };
}
