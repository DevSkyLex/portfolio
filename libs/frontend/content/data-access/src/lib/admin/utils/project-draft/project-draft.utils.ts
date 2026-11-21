import type {
  LocalizedTextDto,
  ProjectCoverDto,
  ProjectRevisionRequest,
  ProjectSeoDto,
} from '@vfortin/content-contracts';
import { SHORT_FIELDS } from '@internal/content-web-data-access/lib/admin/constants/short-fields.constants';
import { PROJECT_ARTICLE_CATEGORY } from '@internal/content-web-data-access/lib/admin/constants/project-article-category.constants';
import type { AdminProject } from '@internal/content-web-data-access/lib/admin/models/admin-project/admin-project.type';
import type { BilingualText } from '@internal/content-web-data-access/lib/admin/models/bilingual-text/bilingual-text.interface';
import type { ProjectCoverDraft } from '@internal/content-web-data-access/lib/admin/models/project-cover/project-cover-draft.interface';
import type { ProjectPeriod } from '@internal/content-web-data-access/lib/admin/models/project-period/project-period.interface';
import type { ProjectDraft } from '@internal/content-web-data-access/lib/admin/models/project-draft/project-draft.interface';
import type { PublicationTaxonomyDraft } from '@internal/content-web-data-access/lib/admin/models/publication-taxonomy/publication-taxonomy-draft.interface';
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
  const category: NonNullable<AdminProject['taxonomy']>['category'] =
    project.taxonomy?.category ??
    (project.taxonomy === undefined && project.kind !== 'article'
      ? PROJECT_ARTICLE_CATEGORY
      : null);
  return {
    taxonomy: {
      category: { key: category?.key ?? '', label: flat(category?.label ?? { fr: '' }) },
      tags: articleTags(project).map((tag) => ({ key: tag.key, label: flat(tag.label) })),
    },
    title: flat(project.title),
    summary: flat(project.summary),
    lead: flat(project.lead),
    period: periodOf(project.period),
    client: flat(project.client),
    role: flat(project.role),
    place: flat(project.place),
    siteUrl: project.siteUrl ?? '',
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

/** Longest taxonomy key and label the article contract accepts (D58). */
const TAXONOMY_KEY_MAX: number = 80;

/**
 * Bounded tag key of a legacy technology, the browser copy of the domain's `technologyTagKey`: a key
 * within 80 characters is kept, a longer one becomes its stem and a 64-bit FNV-1a suffix. The article
 * API exposes such a technology under the bounded key, so merging by this key never duplicates it.
 */
export function technologyTagKey(tech: string): string {
  if (tech.length <= TAXONOMY_KEY_MAX) return tech;
  let hash: bigint = 0xcbf29ce484222325n;
  for (const character of tech) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(character.charCodeAt(0))) * 0x100000001b3n);
  }
  const suffix: string = hash.toString(16);
  const stem: string = tech.slice(0, TAXONOMY_KEY_MAX - suffix.length - 1).replace(/-$/, '');
  return `${stem}-${suffix}`;
}

/** Keeps legacy technology keys available as tags until their next canonical article save. */
export function articleTags(
  article: Pick<AdminProject, 'taxonomy' | 'techs'>,
): NonNullable<AdminProject['taxonomy']>['tags'] {
  const tags: Map<string, NonNullable<AdminProject['taxonomy']>['tags'][number]> = new Map(
    (article.taxonomy?.tags ?? []).map((tag) => [tag.key, tag]),
  );
  for (const tech of article.techs) {
    // The bounded key matches the tag the API already projected; the label stays within the limit.
    const key: string = technologyTagKey(tech);
    const label: string = tech.slice(0, TAXONOMY_KEY_MAX);
    if (!tags.has(key)) tags.set(key, { key, label: { fr: label, en: label } });
  }
  return [...tags.values()];
}

/**
 * Function toRevisionRequest
 *
 * @description
 * Serializes editor values into the revision contract: trimmed texts, the period, tags,
 * the article documents without display attributes (an empty English document is
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
  const taxonomy: PublicationTaxonomyDraft = draft.taxonomy;
  return {
    ...short,
    taxonomy: {
      category: taxonomy.category.label.fr.trim()
        ? {
            key: taxonomy.category.key || publicationCategoryKey(taxonomy.category.label.fr),
            label: localized(taxonomy.category.label),
          }
        : null,
      tags: taxonomy.tags.map((tag) => ({
        key: tag.key || publicationTagKey(tag.label.fr),
        label: localized(tag.label),
      })),
    },
    period: periodOf(draft.period),
    siteUrl: draft.siteUrl.trim() || null,
    techs: [],
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

/** Derives a stable lowercase taxonomy key from a French label. */
export function publicationTagKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
    .replace(/-$/, '');
}

/** The built-in case-study category retains its key in both languages. */
export function publicationCategoryKey(label: string): string {
  const key: string = publicationTagKey(label);
  return key === 'projets' ? PROJECT_ARTICLE_CATEGORY.key : key;
}
