import { PUBLISHED_LOCALES } from '@vfortin/content-application';
import type {
  AdminProjectDto,
  LocalizedTextDto,
  ProjectRevisionRequest,
} from '@vfortin/content-contracts';
import {
  LocalizedText,
  type Project,
  type ProjectProps,
  type ProjectRevision,
} from '@vfortin/content-domain';

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
 * Function toAdminProjectDto
 *
 * @description
 * Converts the aggregate snapshot into the administration response, including publication gaps
 * for the required locales.
 *
 * @param {Project} project - Project aggregate to expose.
 * @param {number} version - Persisted version to report; defaults to the aggregate version.
 * @returns {AdminProjectDto} Administration representation of the project.
 */
export function toAdminProjectDto(
  project: Project,
  version: number = project.version,
): AdminProjectDto {
  const p: ProjectProps = project.snapshot();
  return {
    id: p.id,
    slug: p.slug.value,
    status: p.status,
    version,
    position: p.position,
    title: dto(p.title),
    summary: dto(p.summary),
    lead: dto(p.lead),
    periodLabel: dto(p.periodLabel),
    client: dto(p.client),
    role: dto(p.role),
    place: dto(p.place),
    siteUrl: p.siteUrl,
    techs: [...p.techs],
    featured: p.featured,
    article: {
      context: p.article.context.map(dto),
      work: p.article.work.map(dto),
      workList: p.article.workList.map(dto),
      choices: p.article.choices.map(dto),
      result: p.article.result.map(dto),
      lessons: p.article.lessons.map(dto),
      captions: p.article.captions.map(dto),
    },
    missing: project.missingFor(PUBLISHED_LOCALES),
  };
}

/**
 * Function toProjectRevision
 *
 * @description
 * Converts validated transport translations into domain values; domain factories remain responsible
 * for enforcing text invariants.
 *
 * @param {ProjectRevisionRequest} request - Contract-validated project edit request.
 * @returns {ProjectRevision} Domain revision containing normalized localized text values.
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
  const paragraphs: (field: string, values: readonly LocalizedTextDto[]) => LocalizedText[] = (
    field: string,
    values: readonly LocalizedTextDto[],
  ): LocalizedText[] => values.map((value: LocalizedTextDto): LocalizedText => text(field, value));
  const a: ProjectRevisionRequest['article'] = request.article;
  return {
    title: text('title', request.title),
    summary: text('summary', request.summary),
    lead: text('lead', request.lead),
    periodLabel: text('periodLabel', request.periodLabel),
    client: text('client', request.client),
    role: text('role', request.role),
    place: text('place', request.place),
    siteUrl: request.siteUrl,
    techs: request.techs,
    featured: request.featured,
    article: {
      context: paragraphs('article.context', a.context),
      work: paragraphs('article.work', a.work),
      workList: paragraphs('article.workList', a.workList),
      choices: paragraphs('article.choices', a.choices),
      result: paragraphs('article.result', a.result),
      lessons: paragraphs('article.lessons', a.lessons),
      captions: paragraphs('article.captions', a.captions),
    },
  };
}
