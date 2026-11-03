/**
 * Function techLogo
 *
 * @description
 * Removes the embedded SVG title because the visible technology label already names the icon.
 *
 * @param {string} svg - SVG markup from an icon pack.
 *
 * @returns {string} The same markup without its first `<title>` element.
 */
export const techLogo: (svg: string) => string = (svg: string): string =>
  svg.replace(/<title>[^<]*<\/title>/, '');
