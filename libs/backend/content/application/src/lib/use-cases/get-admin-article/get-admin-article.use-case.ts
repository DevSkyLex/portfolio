import type { Article, PublicationKind } from '@vfortin/content-domain';
import { NotFoundError } from '@internal/content-application/lib/errors/application-error';
import type {
  MediaRecord,
  MediaRepository,
  ArticleRepository,
} from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Interface AdminArticleView
 * @interface AdminArticleView
 *
 * @description
 * Article read by the administrator with the stored media its cover and figures reference.
 */
export interface AdminArticleView {
  // #region Properties
  /**
   * Property project
   * @readonly
   *
   * @description
   * Article aggregate.
   */
  readonly article: Article;

  /**
   * Property media
   * @readonly
   *
   * @description
   * Stored media referenced by the project, in no particular order.
   */
  readonly media: readonly MediaRecord[];
  // #endregion
}

/**
 * Class GetAdminArticle
 * @class GetAdminArticle
 *
 * @description
 * Loads one project aggregate and its media for administration and reports absence as an
 * application error.
 */
export class GetAdminArticle {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects the repositories used to locate project aggregates and their media.
   *
   * @param {ArticleRepository} projects - Article read and write port.
   * @param {MediaRepository} media - Media rows.
   */
  public constructor(
    private readonly projects: ArticleRepository,
    private readonly media: MediaRepository,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Returns the requested project or rejects with `NotFoundError` when no project has that id.
   *
   * @param {string} id - Article identifier.
   * @returns {Promise<AdminArticleView>} Requested project and its media.
   */
  public async execute(id: string, legacyKind?: PublicationKind): Promise<AdminArticleView> {
    const project: Article | null = await this.projects.get(id);
    if (project === null || (legacyKind !== undefined && project.kind !== legacyKind)) {
      throw new NotFoundError('Article');
    }
    return { article: project, media: await this.media.existing(project.mediaIds()) };
  }
  // #endregion
}
