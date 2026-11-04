import { z } from 'zod/mini';

/**
 * Constant PROJECT_SEO_LIMITS
 *
 * @description
 * Longest search title and description accepted for a project; search engines cut longer texts, and the
 * administrator preview warns from `titleWarning` / `descriptionWarning` characters on. Keywords: at
 * most `keywords` per language, each of `keywordMinLength` to `keywordMaxLength` characters after
 * trimming, unique regardless of case.
 */
export const PROJECT_SEO_LIMITS = {
  title: 70,
  titleWarning: 60,
  description: 170,
  descriptionWarning: 155,
  keywords: 10,
  keywordMinLength: 2,
  keywordMaxLength: 40,
} as const;

/**
 * Constant SeoTitle
 *
 * @description
 * Optional trimmed search title; an empty text means "use the project title".
 */
const SeoTitle = z.optional(z.string().check(z.trim(), z.maxLength(PROJECT_SEO_LIMITS.title)));

/**
 * Constant SeoDescription
 *
 * @description
 * Optional trimmed search description; an empty text means "use the project summary".
 */
const SeoDescription = z.optional(
  z.string().check(z.trim(), z.maxLength(PROJECT_SEO_LIMITS.description)),
);

/**
 * Function distinctKeywords
 *
 * @description
 * Whether no two keywords of a list are equal regardless of case.
 *
 * @param {readonly string[]} keywords - Trimmed keywords.
 * @returns {boolean} `true` when every keyword is unique.
 */
const distinctKeywords: (keywords: readonly string[]) => boolean = (
  keywords: readonly string[],
): boolean =>
  new Set(keywords.map((keyword: string): string => keyword.toLocaleLowerCase())).size ===
  keywords.length;

/**
 * Constant Keyword
 *
 * @description
 * One keyword, trimmed, within the length bounds.
 */
const Keyword = z
  .string()
  .check(
    z.trim(),
    z.minLength(PROJECT_SEO_LIMITS.keywordMinLength),
    z.maxLength(PROJECT_SEO_LIMITS.keywordMaxLength),
  );

/**
 * Constant Keywords
 *
 * @description
 * Keywords of one language: at most `PROJECT_SEO_LIMITS.keywords`, unique regardless of case; an empty
 * list lets the public page write the project technologies instead.
 */
const Keywords = z
  .array(Keyword)
  .check(
    z.maxLength(PROJECT_SEO_LIMITS.keywords),
    z.refine(distinctKeywords, { message: 'Each keyword may appear only once.' }),
  );

/**
 * Constant ProjectSeoDtoSchema
 *
 * @description
 * Search title, description and keywords of a project in each language. The texts are optional and the
 * keyword lists may be empty (English may be absent): the public page then falls back on the project
 * title, summary and technologies.
 */
export const ProjectSeoDtoSchema = z.object({
  title: z.object({ fr: SeoTitle, en: SeoTitle }),
  description: z.object({ fr: SeoDescription, en: SeoDescription }),
  keywords: z.object({ fr: Keywords, en: z.optional(Keywords) }),
});

/**
 * Type ProjectSeoDto
 * @type ProjectSeoDto
 *
 * @description
 * Editable search texts and keywords of a project.
 */
export type ProjectSeoDto = z.infer<typeof ProjectSeoDtoSchema>;

/**
 * Constant PublicProjectSeoSchema
 *
 * @description
 * Search texts of a published project in the snapshot locale, `null` when the administrator left them
 * empty, and its keywords, empty when none was written (the page then writes the technologies).
 */
export const PublicProjectSeoSchema = z.object({
  title: z.nullable(z.string().check(z.minLength(1), z.maxLength(PROJECT_SEO_LIMITS.title))),
  description: z.nullable(
    z.string().check(z.minLength(1), z.maxLength(PROJECT_SEO_LIMITS.description)),
  ),
  keywords: Keywords,
});

/**
 * Type PublicProjectSeoDto
 * @type PublicProjectSeoDto
 *
 * @description
 * Localized search texts and keywords of the public snapshot.
 */
export type PublicProjectSeoDto = z.infer<typeof PublicProjectSeoSchema>;
