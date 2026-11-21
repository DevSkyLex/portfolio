import type { Article, PublicationKind } from '@vfortin/content-domain';
import type {
  Clock,
  ContentUnitOfWork,
} from '@internal/content-application/lib/ports/content/content.ports';
import {
  type ArticleChangeResult,
  changeArticle,
} from '@internal/content-application/lib/use-cases/change-article/change-article';

/**
 * Class UnpublishArticle
 * @class UnpublishArticle
 *
 * @description
 * Moves a project to draft state through the transactional change operation.
 */
export class UnpublishArticle {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the unit of work and timestamp source used by the change operation.
   *
   * @param {ContentUnitOfWork} unitOfWork - Atomic content write boundary.
   * @param {Clock} clock - Request timestamp source.
   */
  public constructor(
    private readonly unitOfWork: ContentUnitOfWork,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Sets the project to draft and advances the revision when it was previously public.
   *
   * @param {string} id - Article identifier.
   * @param {number} expectedVersion - Version read before the command.
   * @returns {Promise<ArticleChangeResult>} Updated project and optional public content revision.
   */
  public execute(
    id: string,
    expectedVersion: number,
    legacyKind?: PublicationKind,
  ): Promise<ArticleChangeResult> {
    return changeArticle(
      this.unitOfWork,
      this.clock,
      id,
      expectedVersion,
      (project: Article): void => project.unpublish(),
      legacyKind,
    );
  }
  // #endregion
}
