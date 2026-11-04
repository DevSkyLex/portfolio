import { type MediaRecord, PUBLISHED_LOCALES } from '@vfortin/content-application';
import type {
  AdminProjectDto,
  LocalizedTextDto,
  ProjectCoverDto,
  ProjectRevisionRequest,
  ProjectSeoDto,
} from '@vfortin/content-contracts';
import {
  ArticleDocument,
  LocalizedText,
  type Project,
  type ProjectCover,
  ProjectPeriod,
  type ProjectProps,
  type ProjectRevision,
  ProjectSeo,
} from '@vfortin/content-domain';
import { toMediaDto } from '@internal/content-adapters-in/lib/http/presenters/media/media.presenter';

/**
 * Constant dto
 *
 * @description
 * Converts a localized domain value to the administration contract shape.
 *
 * @param {LocalizedText} text - Domain translation value.
 * @returns {LocalizedTextDto} Contract translation object.
 */
const dto: (text: LocalizedText) => LocalizedTextDto = (text: LocalizedText): LocalizedTextDto =>
  text.toProps();

/**
 * Function coverDto
 *
 * @description
 * Converts a domain cover, leaving out an absent English alternative text.
 *
 * @param {ProjectCover | null} cover - Domain cover.
 * @returns {ProjectCoverDto | null} Contract cover.
 */
function coverDto(cover: ProjectCover | null): ProjectCoverDto | null {
  if (cover === null) {
    return null;
  }
  const { fr, en } = cover.alt;
  return { media: cover.media, alt: en === undefined ? { fr } : { fr, en } };
}

/**
 * Function seoDto
 *
 * @description
 * Converts the search values: absent texts are left out, the French keyword list is always present
 * (empty without keywords) and the English one only when written, as the contract expects.
 *
 * @param {ProjectSeo} seo - Domain search values.
 * @returns {ProjectSeoDto} Contract search values.
 */
function seoDto(seo: ProjectSeo): ProjectSeoDto {
  const { title, description, keywords } = seo.toProps();
  return {
    title,
    description,
    keywords:
      keywords.en === undefined
        ? { fr: [...(keywords.fr ?? [])] }
        : { fr: [...(keywords.fr ?? [])], en: [...keywords.en] },
  };
}

/**
 * Function toAdminProjectDto
 *
 * @description
 * Converts the aggregate snapshot into the administration response, including publication gaps for
 * the required locales and the stored media its cover and figures reference, in reference order.
 *
 * @param {Project} project - Project aggregate to expose.
 * @param {readonly MediaRecord[]} media - Stored media of the project, in any order.
 * @param {number} version - Persisted version to report; defaults to the aggregate version.
 * @returns {AdminProjectDto} Administration representation of the project.
 */
export function toAdminProjectDto(
  project: Project,
  media: readonly MediaRecord[],
  version: number = project.version,
): AdminProjectDto {
  const p: ProjectProps = project.snapshot();
  const records: Map<string, MediaRecord> = new Map(
    media.map((record: MediaRecord): [string, MediaRecord] => [record.id, record]),
  );
  return {
    id: p.id,
    slug: p.slug.value,
    status: p.status,
    version,
    position: p.position,
    title: dto(p.title),
    summary: dto(p.summary),
    lead: dto(p.lead),
    period: p.period.toProps(),
    client: dto(p.client),
    role: dto(p.role),
    place: dto(p.place),
    siteUrl: p.siteUrl,
    techs: [...p.techs],
    featured: p.featured,
    article:
      p.article.en === undefined
        ? { fr: p.article.fr.toProps() }
        : { fr: p.article.fr.toProps(), en: p.article.en.toProps() },
    cover: coverDto(p.cover),
    seo: seoDto(p.seo),
    missing: project.missingFor(PUBLISHED_LOCALES),
    media: project.mediaIds().flatMap((id: string): AdminProjectDto['media'] => {
      const record: MediaRecord | undefined = records.get(id);
      return record === undefined ? [] : [toMediaDto(record)];
    }),
  };
}

/**
 * Function toProjectRevision
 *
 * @description
 * Converts validated transport values into domain values; domain factories remain responsible for
 * enforcing text and document invariants.
 *
 * @param {ProjectRevisionRequest} request - Contract-validated project edit request.
 * @returns {ProjectRevision} Domain revision.
 */
export function toProjectRevision(request: ProjectRevisionRequest): ProjectRevision {
  const text: (field: string, value: LocalizedTextDto) => LocalizedText = (
    field: string,
    value: LocalizedTextDto,
  ): LocalizedText =>
    LocalizedText.of(
      field,
      value.en === undefined ? { fr: value.fr } : { fr: value.fr, en: value.en },
    );
  const { article, cover } = request;
  return {
    title: text('title', request.title),
    summary: text('summary', request.summary),
    lead: text('lead', request.lead),
    period: ProjectPeriod.of(request.period),
    client: text('client', request.client),
    role: text('role', request.role),
    place: text('place', request.place),
    siteUrl: request.siteUrl,
    techs: request.techs,
    featured: request.featured,
    article:
      article.en === undefined
        ? { fr: ArticleDocument.of('article.fr', article.fr) }
        : {
            fr: ArticleDocument.of('article.fr', article.fr),
            en: ArticleDocument.of('article.en', article.en),
          },
    cover:
      cover === null
        ? null
        : {
            media: cover.media,
            alt:
              cover.alt.en === undefined
                ? { fr: cover.alt.fr }
                : { fr: cover.alt.fr, en: cover.alt.en },
          },
    seo: ProjectSeo.of({
      title: request.seo.title,
      description: request.seo.description,
      keywords:
        request.seo.keywords.en === undefined
          ? { fr: request.seo.keywords.fr }
          : { fr: request.seo.keywords.fr, en: request.seo.keywords.en },
    }),
  };
}
