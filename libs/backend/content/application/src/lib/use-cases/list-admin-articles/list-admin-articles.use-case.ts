import type { Article, PublicationKind } from '@vfortin/content-domain';
import type {
  MediaRecord,
  MediaRepository,
  ArticleRepository,
} from '@internal/content-application/lib/ports/content/content.ports';
import type { AdminArticleView } from '@internal/content-application/lib/use-cases/get-admin-article/get-admin-article.use-case';

/**
 * Class ListAdminArticles
 * @class ListAdminArticles
 *
 * @description
 * Lists all administration projects, including drafts, in display order with their media.
 */
export class ListAdminArticles {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the repositories that read project aggregates and media rows.
   *
   * @param {ArticleRepository} projects - Article repository.
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
   * Returns every stored project sorted by its position; the media of all projects are read at once.
   *
   * @returns {Promise<AdminArticleView[]>} Administration project list.
   */
  public async execute(legacyKind?: PublicationKind): Promise<AdminArticleView[]> {
    const projects: Article[] = (await this.projects.list(legacyKind))
      .filter(
        (project: Article): boolean => legacyKind === undefined || project.kind === legacyKind,
      )
      .sort(
        (a: Article, b: Article): number => a.position - b.position || a.id.localeCompare(b.id),
      );
    const records: Map<string, MediaRecord> = new Map(
      (
        await this.media.existing([
          ...new Set(projects.flatMap((project: Article): string[] => project.mediaIds())),
        ])
      ).map((record: MediaRecord): [string, MediaRecord] => [record.id, record]),
    );
    return projects.map((project: Article): AdminArticleView => ({
      article: project,
      media: project.mediaIds().flatMap((id: string): MediaRecord[] => {
        const record: MediaRecord | undefined = records.get(id);
        return record === undefined ? [] : [record];
      }),
    }));
  }
  // #endregion
}
