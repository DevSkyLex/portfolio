/**
 * Function clamp01
 * @function clamp01
 *
 * @description
 * Bounds a progress value to the inclusive interval from zero to one.
 *
 * @param {number} value - Unbounded progress value.
 * @returns {number} Progress clamped to `[0, 1]`.
 */
const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * Function scrollProgress
 * @function scrollProgress
 *
 * @description
 * Computes how far an element has crossed the viewport, from its top entering at the bottom to its bottom leaving
 * at the top.
 *
 * @param {{ top: number; height: number }} rect - Viewport-relative top and element height in CSS pixels.
 * @param {number} vh - Viewport height in CSS pixels.
 * @returns {number} Clamped crossing progress from zero to one.
 */
export const scrollProgress = (rect: { top: number; height: number }, vh: number): number =>
  clamp01((vh - rect.top) / (vh + rect.height));

/**
 * Function scrollEntry
 * @function scrollEntry
 *
 * @description
 * Computes entry progress over the first 45 percent of viewport height after the element top reaches the viewport
 * bottom.
 *
 * @param {{ top: number }} rect - Viewport-relative element top in CSS pixels.
 * @param {number} vh - Viewport height in CSS pixels.
 * @returns {number} Clamped entry progress from zero to one.
 */
export const scrollEntry = (rect: { top: number }, vh: number): number =>
  clamp01((vh - rect.top) / (vh * 0.45));

/**
 * Function pageScrolls
 * @function pageScrolls
 *
 * @description
 * Determines whether the document is tall enough for the page-level scroll variables to animate: document height must
 * be positive and viewport height must be less than 60 percent of it.
 *
 * @param {number} vh - Viewport height in CSS pixels.
 * @param {number} scrollHeight - Document scroll height in CSS pixels.
 * @returns {boolean} Whether `scrollHeight` is positive and `vh < scrollHeight * 0.6`.
 */
export const pageScrolls = (vh: number, scrollHeight: number): boolean =>
  scrollHeight > 0 && vh < scrollHeight * 0.6;
