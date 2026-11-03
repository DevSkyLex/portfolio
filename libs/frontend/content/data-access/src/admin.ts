/**
 * Export AdminContentDataAccess
 *
 * @description
 * Administrator project editor contracts, API and state entry point; kept out of the public site bundle (D18).
 */
export { UNTRANSLATED } from '@internal/content-web-data-access/lib/admin/constants/untranslated.constants';
export type { AdminProject } from '@internal/content-web-data-access/lib/admin/models/admin-project/admin-project.type';
export {
  ARTICLE_SECTIONS,
  type ArticleSection,
} from '@internal/content-web-data-access/lib/admin/models/article-section/article-section.model';
export type { BilingualText } from '@internal/content-web-data-access/lib/admin/models/bilingual-text/bilingual-text.interface';
export type { ProjectDraft } from '@internal/content-web-data-access/lib/admin/models/project-draft/project-draft.interface';
export {
  misalignedSections,
  toProjectDraft,
  toRevisionRequest,
} from '@internal/content-web-data-access/lib/admin/utils/project-draft/project-draft.utils';

/**
 * Export AdminProjectsApiService
 *
 * @description
 * Administrator HTTP adapter for listing, loading, revising, publishing, and unpublishing projects.
 */
export { AdminProjectsApiService } from '@internal/content-web-data-access/lib/admin/services/admin-projects/admin-projects.service';

/**
 * Export AdminProjectsStore
 *
 * @description
 * Administrator project state and its inferred instance type.
 */
export {
  AdminProjectsStore,
  type AdminProjectsStoreType,
} from '@internal/content-web-data-access/lib/admin/state/admin-projects/admin-projects.store';
