import type { Article, PublicationKind } from '@vfortin/content-domain';
import type {
  Clock,
  ContentUnitOfWork,
} from '@internal/content-application/lib/ports/content/content.ports';
import {
  type ArticleChangeResult,
  changeArticle,
} from '@internal/content-application/lib/use-cases/change-article/change-article';
import { PUBLISHED_LOCALES } from '@internal/content-application/lib/use-cases/published-locales/published-locales';

/**
 * Class PublishArticle
 * @class PublishArticle
 *
 * @description
 * Publishes a project through the transactional change operation and required locale rules.
 */
export class PublishArticle {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the unit of work and timestamp source for project and revision writes.
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
   * Publishes the project if its translations are complete for every required locale.
   *
   * @param {string} id - Article identifier.
   * @param {number} expectedVersion - Version read before the command.
   * @returns {Promise<ArticleChangeResult>} Updated project and queued public revision.
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
      (project: Article): void => project.publish(PUBLISHED_LOCALES),
      legacyKind,
    );
  }
  // #endregion
}
