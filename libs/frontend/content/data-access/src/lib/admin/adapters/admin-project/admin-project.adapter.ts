import type {
  AdminProjectDto,
  EditableArticleDocumentDto,
  LocalizedTextDto,
  ProjectSeoDto,
} from '@vfortin/content-contracts';
import { toAdminMedia } from '@internal/content-web-data-access/lib/admin/adapters/admin-media/admin-media.adapter';
import type { AdminProject } from '@internal/content-web-data-access/lib/admin/models/admin-project/admin-project.type';
import type { ArticleDocumentDraft } from '@internal/content-web-data-access/lib/admin/models/article-document/article-document-draft.interface';
import type { ProjectSeo } from '@internal/content-web-data-access/lib/admin/models/project-seo/project-seo.interface';

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
 * Function optionalView
 *
 * @description
 * Keeps only the languages holding a text, so that an absent search text stays absent in the view.
 */
function optionalView(value: ProjectSeoDto['title']): ProjectSeo['title'] {
  return {
    ...(value.fr === undefined ? {} : { fr: value.fr }),
    ...(value.en === undefined ? {} : { en: value.en }),
  };
}

/**
 * Function seoView
 *
 * @description
 * Search values of the response. The services and the site deploy separately
 * (`docs/operations/deployment.md`), so a content service older than the SEO contract answers without
 * `seo`, or without `seo.keywords`: the editor then opens with empty values instead of failing to load
 * the project.
 */
function seoView(dto: AdminProjectDto): ProjectSeo {
  const seo: Partial<AdminProjectDto>['seo'] = (dto as Partial<AdminProjectDto>).seo;
  const keywords: Partial<ProjectSeoDto>['keywords'] = (seo as Partial<ProjectSeoDto> | undefined)
    ?.keywords;
  return {
    title: seo ? optionalView(seo.title) : {},
    description: seo ? optionalView(seo.description) : {},
    keywords: { fr: [...(keywords?.fr ?? [])], en: [...(keywords?.en ?? [])] },
  };
}

/**
 * Function documentView
 *
 * @description
 * Copies a transport document so that later edits of the view never reach the response.
 */
function documentView(document: EditableArticleDocumentDto): ArticleDocumentDraft {
  return structuredClone(document);
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
    period: {
      start: { ...dto.period.start },
      end: dto.period.end === null ? null : { ...dto.period.end },
    },
    client: localizedView(dto.client),
    role: localizedView(dto.role),
    place: localizedView(dto.place),
    siteUrl: dto.siteUrl,
    techs: [...dto.techs],
    featured: dto.featured,
    missing: [...dto.missing],
    article: {
      fr: documentView(dto.article.fr),
      en: dto.article.en === undefined ? null : documentView(dto.article.en),
    },
    cover: dto.cover ? { media: dto.cover.media, alt: localizedView(dto.cover.alt) } : null,
    seo: seoView(dto),
    media: dto.media.map(toAdminMedia),
  };
}
