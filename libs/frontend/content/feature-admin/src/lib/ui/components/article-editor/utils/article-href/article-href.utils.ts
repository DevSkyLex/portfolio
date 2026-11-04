/**
 * Constant ALLOWED_HREF
 *
 * @description
 * Link targets the article contract accepts (D40): `https://` and `mailto:` only.
 */
const ALLOWED_HREF: RegExp = /^(https:\/\/\S+|mailto:\S+)$/;

/**
 * Function isArticleHref
 *
 * @description
 * Whether a link target is accepted by the article contract, within its 2,048-character bound.
 *
 * @param {string} href - Candidate link target.
 *
 * @returns {boolean} `true` for an `https://` or `mailto:` target.
 */
export function isArticleHref(href: string): boolean {
  return href.length <= 2048 && ALLOWED_HREF.test(href);
}
