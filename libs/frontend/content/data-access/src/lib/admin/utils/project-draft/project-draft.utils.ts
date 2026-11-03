import type { LocalizedTextDto, ProjectRevisionRequest } from '@vfortin/content-contracts';
import { SHORT_FIELDS } from '@internal/content-web-data-access/lib/admin/constants/short-fields.constants';
import { UNTRANSLATED } from '@internal/content-web-data-access/lib/admin/constants/untranslated.constants';
import type { AdminProject } from '@internal/content-web-data-access/lib/admin/models/admin-project/admin-project.type';
import {
  ARTICLE_SECTIONS,
  type ArticleSection,
} from '@internal/content-web-data-access/lib/admin/models/article-section/article-section.model';
import type { BilingualText } from '@internal/content-web-data-access/lib/admin/models/bilingual-text/bilingual-text.interface';
import type { ProjectDraft } from '@internal/content-web-data-access/lib/admin/models/project-draft/project-draft.interface';

/**
 * Function flat
 *
 * @description
 * Converts an API localized value into editable strings, representing a missing English translation as empty text.
 *
 * @param {LocalizedTextDto} text - Localized value returned by the API.
 *
 * @returns {BilingualText} Editable French and English field values.
 */
const flat: (text: LocalizedTextDto) => BilingualText = (
  text: LocalizedTextDto,
): BilingualText => ({ fr: text.fr, en: text.en ?? '' });

/**
 * Function joined
 *
 * @description
 * Joins localized paragraphs with blank lines while inserting a placeholder for untranslated English paragraphs when any translation exists.
 *
 * @param {readonly LocalizedTextDto[]} paragraphs - Ordered paragraph values from the API.
 *
 * @returns {BilingualText} Flat editor text whose paragraph positions remain aligned across languages.
 */
const joined: (paragraphs: readonly LocalizedTextDto[]) => BilingualText = (
  paragraphs: readonly LocalizedTextDto[],
): BilingualText => ({
  fr: paragraphs.map((p: { fr: string; en?: string | undefined }): string => p.fr).join('\n\n'),
  en: paragraphs.some((p: { fr: string; en?: string | undefined }): boolean => p.en !== undefined)
    ? paragraphs
        .map((p: { fr: string; en?: string | undefined }): string => p.en ?? UNTRANSLATED)
        .join('\n\n')
    : '',
});

/**
 * Function localized
 *
 * @description
 * Trims editor values and omits English from the API value when it is blank.
 *
 * @param {BilingualText} text - Localized form value to serialize.
 *
 * @returns {LocalizedTextDto} Contract value with normalized whitespace and optional English text.
 */
const localized: (text: BilingualText) => LocalizedTextDto = (
  text: BilingualText,
): LocalizedTextDto =>
  text.en.trim() === '' ? { fr: text.fr.trim() } : { fr: text.fr.trim(), en: text.en.trim() };

/**
 * Function paragraphsOf
 *
 * @description
 * Splits flat editor text on blank lines, trims each paragraph, and removes empty entries.
 *
 * @param {string} value - Text entered in a project field.
 *
 * @returns {string[]} Non-empty paragraphs in their original order.
 */
const paragraphsOf: (value: string) => string[] = (value: string): string[] =>
  value
    .split(/\n\s*\n/)
    .map((p: string): string => p.trim())
    .filter((p: string): boolean => p !== '');

/**
 * Function toProjectDraft
 *
 * @description
 * Projects an administrator project response into editable text, preserving article section order and untranslated paragraph positions.
 *
 * @param {AdminProject} project - Project response loaded for editing.
 *
 * @returns {ProjectDraft} Form values with paragraph arrays represented as blank-line-separated text.
 */
export function toProjectDraft(project: AdminProject): ProjectDraft {
  const article: Record<
    'choices' | 'result' | 'work' | 'context' | 'workList' | 'lessons' | 'captions',
    BilingualText
  > = {} as Record<ArticleSection, BilingualText>;
  for (const section of ARTICLE_SECTIONS) {
    article[section] = joined(project.article[section]);
  }
  return {
    title: flat(project.title),
    summary: flat(project.summary),
    lead: flat(project.lead),
    periodLabel: flat(project.periodLabel),
    client: flat(project.client),
    role: flat(project.role),
    place: flat(project.place),
    siteUrl: project.siteUrl ?? '',
    techs: project.techs.join(', '),
    featured: project.featured,
    article,
  };
}

/**
 * Function misalignedSections
 *
 * @description
 * Finds translated article sections whose English paragraph indexes cannot be paired with the French paragraphs.
 *
 * @param {ProjectDraft} draft - Current bilingual editor values.
 *
 * @returns {ArticleSection[]} Sections with non-empty English text and unequal paragraph counts.
 */
export function misalignedSections(draft: ProjectDraft): ArticleSection[] {
  return ARTICLE_SECTIONS.filter(
    (
      section: 'choices' | 'result' | 'work' | 'context' | 'workList' | 'lessons' | 'captions',
    ): boolean => {
      const { fr, en } = draft.article[section];
      return en.trim() !== '' && paragraphsOf(fr).length !== paragraphsOf(en).length;
    },
  );
}

/**
 * Function toRevisionRequest
 *
 * @description
 * Serializes editor values into the revision contract, pairing English article paragraphs by index and omitting untranslated placeholders.
 *
 * @param {ProjectDraft} draft - Current project form values.
 *
 * @returns {ProjectRevisionRequest} Revision payload with trimmed fields and normalized technology keys.
 */
export function toRevisionRequest(draft: ProjectDraft): ProjectRevisionRequest {
  const short: Pick<ProjectRevisionRequest, (typeof SHORT_FIELDS)[number]> = Object.fromEntries(
    SHORT_FIELDS.map(
      (
        field: 'summary' | 'title' | 'place' | 'lead' | 'periodLabel' | 'client' | 'role',
      ): [
        'summary' | 'title' | 'place' | 'lead' | 'periodLabel' | 'client' | 'role',
        { fr: string; en?: string | undefined },
      ] => [field, localized(draft[field])],
    ),
  ) as Pick<ProjectRevisionRequest, (typeof SHORT_FIELDS)[number]>;
  const article: ProjectRevisionRequest['article'] = {} as ProjectRevisionRequest['article'];
  for (const section of ARTICLE_SECTIONS) {
    const fr: string[] = paragraphsOf(draft.article[section].fr);
    const en: string[] = paragraphsOf(draft.article[section].en);
    article[section] = fr.map((paragraph: string, index: number) => {
      const translation: string | undefined = en[index];
      return translation === undefined || translation === UNTRANSLATED
        ? { fr: paragraph }
        : { fr: paragraph, en: translation };
    });
  }
  return {
    ...short,
    siteUrl: draft.siteUrl.trim() || null,
    techs: draft.techs
      .split(',')
      .map((tech: string): string => tech.trim())
      .filter((tech: string): boolean => tech !== ''),
    featured: draft.featured,
    article,
  };
}
