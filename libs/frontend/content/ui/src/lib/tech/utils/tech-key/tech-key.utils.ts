import { TECH_ALIASES } from '@internal/content-web-ui/lib/tech/constants/tech-aliases.constants';

/**
 * Function techKey
 *
 * @description
 * Turns a typed or stored technology name into its catalogue key: trimmed, lowercase, then an alias
 * (`postgres`, `node.js`, `c#`) replaced by its canonical key. Any other value is returned as is.
 *
 * @param {string} raw - Technology name as typed or stored.
 * @returns {string} Canonical catalogue key, or the trimmed lowercase value when it is no alias.
 */
export function techKey(raw: string): string {
  const key: string = raw.trim().toLowerCase();
  return TECH_ALIASES[key] ?? key;
}
