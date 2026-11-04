/**
 * Function seoDescription
 *
 * @description
 * Fits a text into a meta description (D42): whitespace collapsed, and a text longer than `max` cut at
 * the last word boundary before it, its trailing punctuation dropped and an ellipsis appended, so the
 * result never exceeds `max` characters.
 *
 * @param {string} text - Source text, such as a project summary.
 * @param {number} max - Longest result, 160 characters by default (what search engines show).
 *
 * @returns {string} Description of at most `max` characters.
 */
export function seoDescription(text: string, max: number = 160): string {
  const flat: string = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const head: string = flat.slice(0, max - 1);
  const space: number = head.lastIndexOf(' ');
  // A single very long word is cut inside it rather than reduced to a few characters.
  const cut: string = space >= max / 2 ? head.slice(0, space) : head;
  return `${cut.replace(/[\s,;:.!?…\-–—]+$/u, '')}…`;
}
