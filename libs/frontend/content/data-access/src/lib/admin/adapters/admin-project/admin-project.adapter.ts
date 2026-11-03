import type { AdminProjectDto, LocalizedTextDto } from '@vfortin/content-contracts';
import type { AdminProject } from '@internal/content-web-data-access/lib/admin/models/admin-project/admin-project.type';

/**
 * Function localizedView
 *
 * @description
 * Omits absent translations rather than carrying transport undefined values into the view model.
 */
function localizedView(value: LocalizedTextDto): AdminProject['title'] {
  return { fr: value.fr, ...(value.en === undefined ? {} : { en: value.en }) };
}

/**
 * Function toAdminProject
 *
 * @description
 * Projects a transport project into an independently owned view model and copies nested mutable collections.
 *
 * @param {AdminProjectDto} dto - Successful API representation.
 * @returns {AdminProject} Isolated administration projection.
 */
export function toAdminProject(dto: AdminProjectDto): AdminProject {
  return {
    id: dto.id,
    slug: dto.slug,
    status: dto.status,
    version: dto.version,
    position: dto.position,
    title: localizedView(dto.title),
    summary: localizedView(dto.summary),
    lead: localizedView(dto.lead),
    periodLabel: localizedView(dto.periodLabel),
    client: localizedView(dto.client),
    role: localizedView(dto.role),
    place: localizedView(dto.place),
    siteUrl: dto.siteUrl,
    techs: [...dto.techs],
    featured: dto.featured,
    missing: [...dto.missing],
    article: {
      context: dto.article.context.map(localizedView),
      work: dto.article.work.map(localizedView),
      workList: dto.article.workList.map(localizedView),
      choices: dto.article.choices.map(localizedView),
      result: dto.article.result.map(localizedView),
      lessons: dto.article.lessons.map(localizedView),
      captions: dto.article.captions.map(localizedView),
    },
  };
}
