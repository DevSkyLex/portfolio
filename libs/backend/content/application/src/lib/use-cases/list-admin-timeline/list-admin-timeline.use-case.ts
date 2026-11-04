import type { TimelineEntry, TimelineKind } from '@vfortin/content-domain';
import type {
  TimelineEntryRepository,
  TimelineListRepository,
} from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Interface AdminTimelineView
 * @interface AdminTimelineView
 *
 * @description
 * Entries of one kind in their editorial order with the list version a reorder must quote.
 */
export interface AdminTimelineView {
  // #region Properties
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Kind of the listed entries.
   */
  readonly kind: TimelineKind;

  /**
   * Property version
   * @readonly
   *
   * @description
   * List version (`If-Match` of a reorder).
   */
  readonly version: number;

  /**
   * Property entries
   * @readonly
   *
   * @description
   * Entries ordered by position.
   */
  readonly entries: readonly TimelineEntry[];
  // #endregion
}

/**
 * Class ListAdminTimeline
 * @class ListAdminTimeline
 *
 * @description
 * Lists the entries of one kind for the administration.
 */
export class ListAdminTimeline {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the entry and list version repositories.
   *
   * @param {TimelineEntryRepository} entries - Timeline entries.
   * @param {TimelineListRepository} lists - List versions.
   */
  public constructor(
    private readonly entries: TimelineEntryRepository,
    private readonly lists: TimelineListRepository,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Reads the list version before the entries: a change in between leaves the client with an older
   * version, so its next reorder fails with a conflict instead of applying to a list it never saw.
   *
   * @param {TimelineKind} kind - Kind to list.
   * @returns {Promise<AdminTimelineView>} Version and ordered entries.
   */
  public async execute(kind: TimelineKind): Promise<AdminTimelineView> {
    const version: number = await this.lists.version(kind);
    return { kind, version, entries: await this.entries.listByKind(kind) };
  }
  // #endregion
}
