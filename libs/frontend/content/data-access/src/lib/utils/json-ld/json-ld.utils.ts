/**
 * Function jsonLdText
 *
 * @description
 * Serializes structured data for a `script type="application/ld+json"` data block. Every `<` is
 * written as `<`, so a text containing `</script>` cannot close the element in the prerendered
 * HTML; the parsed JSON value is unchanged.
 *
 * @param {Readonly<Record<string, unknown>>} data - schema.org object.
 *
 * @returns {string} JSON text safe inside a script element.
 */
export function jsonLdText(data: Readonly<Record<string, unknown>>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
