/**
 * Function slugify
 *
 * @description
 * Turns a heading label into a fragment identifier: NFD normalization with the combining marks
 * removed, the French ligatures spelled out, lowercase, every run of other characters replaced by one
 * hyphen and the edge hyphens trimmed. The result may be empty (a label made of punctuation only).
 *
 * @param {string} label - Plain text of the heading.
 *
 * @returns {string} Slug made of `a-z`, `0-9` and inner hyphens.
 */
export function slugify(label: string): string {
  return label
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
