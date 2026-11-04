import type {
  Clock,
  MediaRecord,
  MediaRepository,
  MediaStorage,
} from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Constant MEDIA_GRACE_MS
 *
 * @description
 * Time a media stays stored after it stopped being referenced (or was uploaded without being saved
 * in a project): seven days, long enough to undo a removal or finish a draft (D40).
 */
export const MEDIA_GRACE_MS: number = 7 * 24 * 60 * 60 * 1000;

/**
 * Class PurgeMedia
 * @class PurgeMedia
 *
 * @description
 * Deletes the media unreferenced for longer than `MEDIA_GRACE_MS`: the row first, then its files, so
 * a failure leaves at worst an orphan file and never a row pointing to missing files.
 */
export class PurgeMedia {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the media rows, the file storage and the clock.
   *
   * @param {MediaRepository} media - Media rows.
   * @param {MediaStorage} storage - Media files.
   * @param {Clock} clock - Time source of the grace period.
   */
  public constructor(
    private readonly media: MediaRepository,
    private readonly storage: MediaStorage,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Deletes every stale media still stale at deletion time; a media referenced again in between is
   * kept by the conditional delete.
   *
   * @returns {Promise<{ purged: string[] }>} Identifiers of the deleted media.
   */
  public async execute(): Promise<{ purged: string[] }> {
    const before: Date = new Date(this.clock.now().getTime() - MEDIA_GRACE_MS);
    const purged: string[] = [];
    for (const record of await this.media.stale(before)) {
      if (await this.media.delete(record.id, before)) {
        await this.storage.remove(record.id);
        purged.push((record satisfies MediaRecord).id);
      }
    }
    return { purged };
  }
  // #endregion
}
