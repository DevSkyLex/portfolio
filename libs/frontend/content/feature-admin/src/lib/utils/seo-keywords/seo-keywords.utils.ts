import { PROJECT_SEO_LIMITS } from '@internal/content-web-feature-admin/lib/constants/project-seo-limits.constants';

/**
 * Function keywordsError
 *
 * @description
 * The contract's keyword rules applied in the browser (D10): at most `PROJECT_SEO_LIMITS.keywords`,
 * each of `keywordMinLength` to `keywordMaxLength` characters once trimmed, unique regardless of case.
 *
 * @param {readonly string[]} keywords - Keywords of one language.
 *
 * @returns {{ kind: string; message: string } | null} The first broken rule, or `null`.
 */
export function keywordsError(
  keywords: readonly string[],
): { kind: string; message: string } | null {
  const { keywords: max, keywordMinLength: min, keywordMaxLength: longest } = PROJECT_SEO_LIMITS;
  if (keywords.length > max)
    return {
      kind: 'maxLength',
      message: $localize`:@@admin.project.seo.keywordsMax:${max}:max: mots clés maximum.`,
    };
  const trimmed: string[] = keywords.map((keyword: string): string => keyword.trim());
  if (trimmed.some((keyword: string): boolean => keyword.length < min || keyword.length > longest))
    return {
      kind: 'keywordLength',
      message: $localize`:@@admin.project.seo.keywordLength:Chaque mot clé compte de ${min}:min: à ${longest}:max: caractères.`,
    };
  if (
    new Set(trimmed.map((keyword: string): string => keyword.toLocaleLowerCase())).size !==
    trimmed.length
  )
    return {
      kind: 'duplicate',
      message: $localize`:@@admin.project.seo.keywordDuplicate:Chaque mot clé ne doit figurer qu’une fois.`,
    };
  return null;
}

/**
 * Function mergeKeywords
 *
 * @description
 * « Reprendre les technos »: appends the technology keys missing from the keywords (compared regardless
 * of case), skipping keys shorter than a keyword may be, up to `PROJECT_SEO_LIMITS.keywords`; the
 * written keywords keep their order.
 *
 * @param {readonly string[]} keywords - Current keywords of one language.
 * @param {readonly string[]} techs - Technology keys of the project.
 *
 * @returns {string[]} The merged keywords.
 */
export function mergeKeywords(keywords: readonly string[], techs: readonly string[]): string[] {
  const seen: Set<string> = new Set<string>(
    keywords.map((keyword: string): string => keyword.trim().toLocaleLowerCase()),
  );
  const merged: string[] = [...keywords];
  for (const tech of techs) {
    const key: string = tech.trim();
    if (merged.length >= PROJECT_SEO_LIMITS.keywords) break;
    if (key.length < PROJECT_SEO_LIMITS.keywordMinLength || seen.has(key.toLocaleLowerCase()))
      continue;
    seen.add(key.toLocaleLowerCase());
    merged.push(key);
  }
  return merged;
}
