/**
 * Function normalizeSearch
 *
 * @description
 * Folds text for search comparison: accents removed and lower case, so that "medecin" finds "Médecin".
 *
 * @param {string} text - Text to compare.
 *
 * @returns {string} The folded text.
 */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
