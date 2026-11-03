/**
 * Function periodYears
 *
 * @description
 * Extracts distinct four-digit years for the compact home card label; labels without a year stay unchanged.
 * The project article retains the original full period label.
 *
 * @param {string} label - Period text supplied by the project content.
 *
 * @returns {string} Distinct years joined by an em dash, or the original label when none are present.
 */
export function periodYears(label: string): string {
  const years: string[] = [...new Set(label.match(/\b\d{4}\b/g) ?? [])];
  return years.length > 0 ? years.join(' — ') : label;
}
