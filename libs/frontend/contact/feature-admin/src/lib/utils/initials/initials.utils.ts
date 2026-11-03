/**
 * Function initials
 *
 * @description
 * Up to two initials of a sender for the avatar fallback: the first letters of the first and last
 * words.
 *
 * @param {string} name - Sender name as typed in the contact form.
 *
 * @returns {string} Upper-case initials, empty for a blank name.
 */
export function initials(name: string): string {
  const words: string[] = name.trim().split(/\s+/).filter(Boolean);
  return [...words.slice(0, 1), ...words.slice(1).slice(-1)]
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
}
