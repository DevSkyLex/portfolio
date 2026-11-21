import { Article, type ArticleRevision, type PublicationKind, Slug } from '@vfortin/content-domain';
import { MediaNotFoundError } from '@internal/content-application/lib/errors/application-error';
import { assertImageCover } from '@internal/content-application/lib/use-cases/revise-article/revise-article.use-case';
import type {
  ContentRepositories,
  ContentUnitOfWork,
  IdGenerator,
  MediaRecord,
} from '@internal/content-application/lib/ports/content/content.ports';
import type { ArticleChangeResult } from '@internal/content-application/lib/use-cases/change-article/change-article';

/**
 * Class CreateArticle
 * @class CreateArticle
 *
 * @description
 * Adds a draft project after the last one. Its slug derives from the French title and stays fixed
 * afterwards (the public URL); a draft does not advance the public content revision.
 */
export class CreateArticle {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the transaction boundary and the identifier source.
   *
   * @param {ContentUnitOfWork} unitOfWork - Atomic project and media writes.
   * @param {IdGenerator} ids - Identifier of the new project.
   */
  public constructor(
    private readonly unitOfWork: ContentUnitOfWork,
    private readonly ids: IdGenerator,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Picks the first free slug from the French title and the position after the last project, fails
   * with `MediaNotFoundError` when the revision references an unknown media, inserts the draft and
   * takes its media out of the purge grace period (D40).
   *
   * @param {ArticleRevision} revision - Content of the new project.
   * @returns {Promise<ArticleChangeResult>} Created draft, version 1, no revision and its media.
   */
  public execute(
    revision: ArticleRevision,
    legacyKind?: PublicationKind,
  ): Promise<ArticleChangeResult> {
    return this.unitOfWork.run(
      async ({ projects, media }: ContentRepositories): Promise<ArticleChangeResult> => {
        const existing: Article[] = await projects.list();
        const slug: Slug = Slug.fromTitle(
          revision.title.toProps().fr,
          new Set(existing.map((project: Article): string => project.slug.value)),
        );
        const position: number =
          existing
            .filter(
              (entry: Article): boolean => legacyKind === undefined || entry.kind === legacyKind,
            )
            .reduce(
              (last: number, project: Article): number => Math.max(last, project.position),
              -1,
            ) + 1;
        const project: Article = Article.create(
          { id: this.ids.next(), slug, position, kind: legacyKind ?? 'article' },
          revision,
        );
        const mediaIds: string[] = project.mediaIds();
        const found: MediaRecord[] = await media.existing(mediaIds);
        const known: Set<string> = new Set(found.map((record: MediaRecord): string => record.id));
        const unknown: string[] = mediaIds.filter((id: string): boolean => !known.has(id));
        if (unknown.length > 0) {
          throw new MediaNotFoundError(unknown);
        }
        assertImageCover(project.coverMedia(), found);
        await projects.insert(project);
        if (mediaIds.length > 0) {
          await media.relink(mediaIds);
        }
        return {
          article: project,
          version: project.version,
          revision: null,
          media: await media.existing(mediaIds),
        };
      },
    );
  }
  // #endregion
}
