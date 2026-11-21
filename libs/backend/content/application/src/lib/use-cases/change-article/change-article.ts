import type { Article, PublicationKind } from '@vfortin/content-domain';
import { NotFoundError } from '@internal/content-application/lib/errors/application-error';
import type {
  Clock,
  ContentRepositories,
  ContentUnitOfWork,
  MediaRecord,
} from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Interface ArticleChangeResult
 * @interface ArticleChangeResult
 *
 * @description
 * Result of an optimistic project update and its optional public content revision.
 */
export interface ArticleChangeResult {
  // #region Properties
  /**
   * Property project
   * @readonly
   *
   * @description
   * Updated aggregate after the transaction has saved it.
   */
  readonly article: Article;

  /**
   * Property version
   * @readonly
   *
   * @description
   * Version assigned by the repository after matching the expected version.
   */
  readonly version: number;

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Public content revision, or `null` when the project was and remains a draft.
   */
  readonly revision: number | null;

  /**
   * Property media
   * @readonly
   *
   * @description
   * Stored media referenced by the updated project, for the administrator editor.
   */
  readonly media: readonly MediaRecord[];
  // #endregion
}

/**
 * Type ArticleChange
 * @type ArticleChange
 *
 * @description
 * Mutation applied to the loaded aggregate inside the unit of work, before it is saved.
 */
export type ArticleChange = (
  project: Article,
  repositories: ContentRepositories,
) => void | Promise<void>;

/**
 * Function changeArticle
 *
 * @description
 * Applies a project mutation with optimistic locking. If it was or becomes published, the
 * content revision is written in the same unit of work as the project.
 *
 * @param {ContentUnitOfWork} unitOfWork - Transaction boundary for the project and revision writes.
 * @param {Clock} clock - Source of the request timestamp.
 * @param {string} id - Article identifier to load.
 * @param {number} expectedVersion - Version that must still be stored for the save to succeed.
 * @param {ArticleChange} change - Mutation applied to the loaded aggregate.
 * @returns {Promise<ArticleChangeResult>} Updated project, new version, optional public content revision
 * and referenced media.
 */
export function changeArticle(
  unitOfWork: ContentUnitOfWork,
  clock: Clock,
  id: string,
  expectedVersion: number,
  change: ArticleChange,
  legacyKind?: PublicationKind,
): Promise<ArticleChangeResult> {
  return unitOfWork.run(async (repositories: ContentRepositories): Promise<ArticleChangeResult> => {
    const { projects, buildRequests, media } = repositories;
    const project: Article | null = await projects.get(id);
    if (project === null || (legacyKind !== undefined && project.kind !== legacyKind)) {
      throw new NotFoundError('Article');
    }
    const wasPublished: boolean = project.isPublished();
    await change(project, repositories);
    const version: number = await projects.save(project, expectedVersion);
    const revision: number | null =
      wasPublished || project.isPublished() ? await buildRequests.request(clock.now()) : null;
    return { article: project, version, revision, media: await media.existing(project.mediaIds()) };
  });
}
