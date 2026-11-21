import type { Article, ArticleRevision, PublicationKind } from '@vfortin/content-domain';
import {
  CoverNotImageError,
  MediaNotFoundError,
} from '@internal/content-application/lib/errors/application-error';
import type {
  Clock,
  ContentRepositories,
  ContentUnitOfWork,
  MediaRecord,
} from '@internal/content-application/lib/ports/content/content.ports';
import {
  type ArticleChangeResult,
  changeArticle,
} from '@internal/content-application/lib/use-cases/change-article/change-article';
import { PUBLISHED_LOCALES } from '@internal/content-application/lib/use-cases/published-locales/published-locales';

/**
 * Class ReviseArticle
 * @class ReviseArticle
 *
 * @description
 * Applies editable project fields using the aggregate's publication completeness rules, and keeps the
 * purge state of the media it references in step (D40).
 */
export class ReviseArticle {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the unit of work and timestamp source for project, media and revision writes.
   *
   * @param {ContentUnitOfWork} unitOfWork - Atomic content write boundary.
   * @param {Clock} clock - Request and unlink timestamp source.
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
   * Applies an edit while preserving the aggregate's identity and persistence-managed fields. A
   * published project is rejected if the edit removes required locale content, and any revision
   * referencing an unknown media (cover or figure) fails with `MediaNotFoundError`. In the same unit
   * of work, media no longer referenced start their purge grace period and media referenced again
   * leave it.
   *
   * @param {string} id - Article identifier.
   * @param {number} expectedVersion - Version read before the command.
   * @param {ArticleRevision} revision - Editable fields to apply.
   * @returns {Promise<ArticleChangeResult>} Updated project, its media and optional queued revision.
   */
  public execute(
    id: string,
    expectedVersion: number,
    revision: ArticleRevision,
    legacyKind?: PublicationKind,
  ): Promise<ArticleChangeResult> {
    return changeArticle(
      this.unitOfWork,
      this.clock,
      id,
      expectedVersion,
      async (project: Article, { media }: ContentRepositories): Promise<void> => {
        const before: string[] = project.mediaIds();
        project.revise(revision, PUBLISHED_LOCALES);
        const after: string[] = project.mediaIds();
        const records: MediaRecord[] = await media.existing(after);
        const found: Set<string> = new Set(records.map((record: MediaRecord): string => record.id));
        const unknown: string[] = after.filter((mediaId: string): boolean => !found.has(mediaId));
        if (unknown.length > 0) {
          throw new MediaNotFoundError(unknown);
        }
        assertImageCover(project.coverMedia(), records);
        const removed: string[] = before.filter(
          (mediaId: string): boolean => !after.includes(mediaId),
        );
        const added: string[] = after.filter(
          (mediaId: string): boolean => !before.includes(mediaId),
        );
        if (removed.length > 0) {
          await media.markUnlinked(removed, this.clock.now());
        }
        if (added.length > 0) {
          await media.relink(added);
        }
      },
      legacyKind,
    );
  }
  // #endregion
}

/**
 * Function assertImageCover
 *
 * @description
 * Rejects a cover that points to a video (D57); figures accept both kinds.
 *
 * @param {string | null} cover - Cover media identifier, or `null`.
 * @param {readonly MediaRecord[]} records - Stored media the project references.
 * @throws {CoverNotImageError} When the cover media is a video.
 */
export function assertImageCover(cover: string | null, records: readonly MediaRecord[]): void {
  if (
    cover !== null &&
    records.some((record: MediaRecord): boolean => record.id === cover && record.kind === 'video')
  ) {
    throw new CoverNotImageError();
  }
}
