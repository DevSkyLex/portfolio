import { PROJECT_SHORT_FIELDS } from '@internal/content-web-feature-admin/lib/constants/project-short-fields.constants';

/**
 * Constant LANGUAGES
 *
 * @description
 * Names of the content languages as written after a field label, in the admin's language.
 */
const LANGUAGES: Readonly<Record<string, string>> = {
  fr: $localize`:@@admin.content.language.fr:français`,
  en: $localize`:@@admin.content.language.en:anglais`,
};

/**
 * Function missingLabel
 *
 * @description
 * Readable label of a path of the API's `missing` list (D40), in the admin's language: `title.en`
 * becomes « Titre (anglais) », `article.en` « Article (anglais) », `article.fr.figures` « Textes
 * alternatifs des images (français) », `cover.alt.en` « Texte alternatif de la couverture
 * (anglais) ». An unknown path is returned as it is.
 *
 * @param {string} path - Missing field path.
 *
 * @returns {string} Readable label.
 */
export function missingLabel(path: string): string {
  const parts: string[] = path.split('.');
  const language: string | undefined = LANGUAGES[parts.at(-1) ?? ''] ?? LANGUAGES[parts[1] ?? ''];
  if (!language) return path;
  if (parts[0] === 'article')
    return parts[2] === 'figures'
      ? $localize`:@@admin.content.missing.figures:Textes alternatifs des images (${language}:language:)`
      : $localize`:@@admin.content.missing.article:Article (${language}:language:)`;
  if (parts[0] === 'cover')
    return $localize`:@@admin.content.missing.coverAlt:Texte alternatif de la couverture (${language}:language:)`;
  const field: { readonly label: string } | undefined = PROJECT_SHORT_FIELDS.find(
    (candidate): boolean => candidate.key === parts[0],
  );
  return field && parts.length === 2
    ? $localize`:@@admin.content.missing.field:${field.label}:field: (${language}:language:)`
    : path;
}
