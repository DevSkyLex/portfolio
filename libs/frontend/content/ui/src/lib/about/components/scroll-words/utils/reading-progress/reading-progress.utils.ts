/**
 * Function readingProgress
 *
 * @description
 * Maps a block's vertical position to clamped reading progress using the 85% viewport entry threshold.
 *
 * @param {{ top: number; height: number }} rect - Block position and height in CSS pixels.
 * @param {number} vh - Viewport height in CSS pixels.
 *
 * @returns {number} Reading progress in `[0, 1]`.
 */
export const readingProgress: (rect: { top: number; height: number }, vh: number) => number = (
  rect: { top: number; height: number },
  vh: number,
): number => Math.min(1, Math.max(0, (vh * 0.85 - rect.top) / (rect.height + vh * 0.35)));
