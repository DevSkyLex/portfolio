/**
 * Function serverPath
 *
 * @description
 * Form field holding a server violation path: anything inside an article document
 * (`article.fr.content.3.content.0.text`) belongs to the editor of that language, anything inside
 * the period (`period.end`, `period.start.month`) to its picker. Each tag keeps its index to target
 * the corresponding bilingual editor row; other array paths fall back to their parent (`techs.0` → `techs`).
 *
 * @param {string} path - Violation path of the API.
 *
 * @returns {string} Path of the form field.
 */
export function serverPath(path: string): string {
  const article: RegExpExecArray | null = /^article\.(fr|en)(?:\.|$)/.exec(path);
  if (article) return `article.${article[1]}`;
  if (path === 'cover') return 'cover.media';
  if (/^period(?:\.|$)/.test(path)) return 'period';
  if (path.startsWith('taxonomy.tags.')) return path;
  return path.replace(/\.\d+(?=\.|$)/g, '');
}
