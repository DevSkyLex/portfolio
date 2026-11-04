/**
 * Constant AURORA_TOKENS
 *
 * @description
 * Names of the Orbite accent colors consumed by canvas drawing code. Their computed
 * values follow the theme applied to the element on which they are read.
 */
export const AURORA_TOKENS: readonly [
  '--aurora-pink',
  '--aurora-violet',
  '--aurora-blue',
  '--aurora-cyan',
] = ['--aurora-pink', '--aurora-violet', '--aurora-blue', '--aurora-cyan'] as const;

/**
 * Type AuroraToken
 *
 * @description
 * One of the accent color custom properties exposed for canvas rendering.
 */
export type AuroraToken = (typeof AURORA_TOKENS)[number];

/**
 * Type ColorToken
 *
 * @description
 * Orbite color custom property supported by the drawing code, including accents,
 * background, foreground, border and signal colors.
 */
export type ColorToken =
  | AuroraToken
  | '--surface'
  | '--surface-raised'
  | '--fg'
  | '--fg-muted'
  | '--fg-faint'
  | '--border'
  | '--accent';

/**
 * Function readToken
 *
 * @description
 * Reads the resolved custom property from an element after its active theme has
 * been applied. Whitespace surrounding the computed value is removed.
 *
 * @param {Element} element - Element whose computed styles provide the active theme.
 * @param {ColorToken} token - Name of the Orbite color custom property to read.
 * @returns {string} Computed token value, or an empty string when it is unset.
 */
export function readToken(element: Element, token: ColorToken): string {
  return getComputedStyle(element).getPropertyValue(token).trim();
}
