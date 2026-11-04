import type {
  LocalizedTextDto,
  ProjectCoverDto,
  ProjectRevisionRequest,
  ProjectSeoDto,
} from '@vfortin/content-contracts';
import { SHORT_FIELDS } from '@internal/content-web-data-access/lib/admin/constants/short-fields.constants';
import type { AdminProject } from '@internal/content-web-data-access/lib/admin/models/admin-project/admin-project.type';
import type { BilingualText } from '@internal/content-web-data-access/lib/admin/models/bilingual-text/bilingual-text.interface';
import type { ProjectCoverDraft } from '@internal/content-web-data-access/lib/admin/models/project-cover/project-cover-draft.interface';
import type { ProjectPeriod } from '@internal/content-web-data-access/lib/admin/models/project-period/project-period.interface';
import type { ProjectDraft } from '@internal/content-web-data-access/lib/admin/models/project-draft/project-draft.interface';
import {
  emptyArticleDocument,
  isArticleEmpty,
  withFigureSources,
  withoutFigureSources,
} from '@internal/content-web-data-access/lib/admin/utils/article-document/article-document.utils';

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
const flat: (text: {
  readonly fr: string;
  readonly en?: string | undefined;
}) => BilingualText = (text: {
  readonly fr: string;
  readonly en?: string | undefined;
}): BilingualText => ({ fr: text.fr, en: text.en ?? '' });

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
 * Function optional
 *
 * @description
 * Trims both languages of a search text and omits the blank ones, which fall back on the title or the
 * summary.
 *
 * @param {BilingualText} text - Search text form value.
 *
 * @returns {ProjectSeoDto['title']} Contract value holding only the written languages.
 */
const optional: (text: BilingualText) => ProjectSeoDto['title'] = (
  text: BilingualText,
): ProjectSeoDto['title'] => {
  const fr: string = text.fr.trim();
  const en: string = text.en.trim();
  return { ...(fr === '' ? {} : { fr }), ...(en === '' ? {} : { en }) };
};

/**
 * Function keywordsOf
 *
 * @description
 * Trims the keywords of both languages and drops blank ones; the French list is always sent, the
 * English one only when it holds a keyword.
 *
 * @param {{ fr: string[]; en: string[] }} keywords - Keyword form values.
 *
 * @returns {ProjectSeoDto['keywords']} Contract keywords.
 */
const keywordsOf: (keywords: {
  fr: string[];
  en: string[];
}) => ProjectSeoDto['keywords'] = (keywords: {
  fr: string[];
  en: string[];
}): ProjectSeoDto['keywords'] => {
  const clean = (list: string[]): string[] =>
    list.map((keyword: string): string => keyword.trim()).filter(Boolean);
  const fr: string[] = clean(keywords.fr);
  const en: string[] = clean(keywords.en);
  return en.length === 0 ? { fr } : { fr, en };
};

/**
 * Function periodOf
 *
 * @description
 * Copies a period, so the draft and the request never share a bound with the loaded project.
 *
 * @param {ProjectPeriod} period - Period.
 *
 * @returns {ProjectPeriod} Copy.
 */
const periodOf: (period: ProjectPeriod) => ProjectPeriod = (
  period: ProjectPeriod,
): ProjectPeriod => ({
  start: { year: period.start.year, month: period.start.month },
  end: period.end === null ? null : { year: period.end.year, month: period.end.month },
});

/**
 * Function coverOf
 *
 * @description
 * Serializes the edited cover: `null` without media, otherwise the media with its trimmed
 * alternative texts, the French one possibly empty in a draft.
 *
 * @param {ProjectCoverDraft} cover - Cover form value.
 *
 * @returns {ProjectCoverDto | null} Contract cover.
 */
const coverOf: (cover: ProjectCoverDraft) => ProjectCoverDto | null = (
  cover: ProjectCoverDraft,
): ProjectCoverDto | null =>
  cover.media.trim() === '' ? null : { media: cover.media.trim(), alt: localized(cover.alt) };

/**
 * Function toProjectDraft
 *
 * @description
 * Projects an administrator project response into editable values: flat bilingual texts, one article
 * document per language whose figures carry the URL of their media for display (an unwritten English
 * article becomes an empty document), a cover always present for its fields and the search texts, an
 * absent one as empty text.
 *
 * @param {AdminProject} project - Project response loaded for editing.
 *
 * @returns {ProjectDraft} Independent form values.
 */
export function toProjectDraft(project: AdminProject): ProjectDraft {
  return {
    title: flat(project.title),
    summary: flat(project.summary),
    lead: flat(project.lead),
    period: periodOf(project.period),
    client: flat(project.client),
    role: flat(project.role),
    place: flat(project.place),
    siteUrl: project.siteUrl ?? '',
    techs: [...project.techs],
    featured: project.featured,
    article: {
      fr: withFigureSources(project.article.fr, project.media),
      en: project.article.en
        ? withFigureSources(project.article.en, project.media)
        : emptyArticleDocument(),
    },
    cover: project.cover
      ? { media: project.cover.media, alt: flat(project.cover.alt) }
      : { media: '', alt: { fr: '', en: '' } },
    seo: {
      title: { fr: project.seo.title.fr ?? '', en: project.seo.title.en ?? '' },
      description: { fr: project.seo.description.fr ?? '', en: project.seo.description.en ?? '' },
      keywords: { fr: [...project.seo.keywords.fr], en: [...project.seo.keywords.en] },
    },
  };
}

/**
 * Function toRevisionRequest
 *
 * @description
 * Serializes editor values into the revision contract: trimmed texts, the period, normalized
 * technology keys, the article documents without display attributes (an empty English document is
 * omitted), the cover, the search texts without their blank languages and the trimmed keywords (an
 * empty English list omitted).
 *
 * @param {ProjectDraft} draft - Current project form values.
 *
 * @returns {ProjectRevisionRequest} Revision payload.
 * @throws {Error} Without a period, which the form requires before submitting.
 */
export function toRevisionRequest(draft: ProjectDraft): ProjectRevisionRequest {
  const short: Pick<ProjectRevisionRequest, (typeof SHORT_FIELDS)[number]> = Object.fromEntries(
    SHORT_FIELDS.map(
      (field: (typeof SHORT_FIELDS)[number]): [(typeof SHORT_FIELDS)[number], LocalizedTextDto] => [
        field,
        localized(draft[field]),
      ],
    ),
  ) as Pick<ProjectRevisionRequest, (typeof SHORT_FIELDS)[number]>;
  if (draft.period === null) throw new Error('A project period is required.');
  return {
    ...short,
    period: periodOf(draft.period),
    siteUrl: draft.siteUrl.trim() || null,
    techs: draft.techs
      .map((tech: string): string => tech.trim())
      .filter((tech: string): boolean => tech !== ''),
    featured: draft.featured,
    article: isArticleEmpty(draft.article.en)
      ? { fr: withoutFigureSources(draft.article.fr) }
      : {
          fr: withoutFigureSources(draft.article.fr),
          en: withoutFigureSources(draft.article.en),
        },
    cover: coverOf(draft.cover),
    seo: {
      title: optional(draft.seo.title),
      description: optional(draft.seo.description),
      keywords: keywordsOf(draft.seo.keywords),
    },
  };
}
