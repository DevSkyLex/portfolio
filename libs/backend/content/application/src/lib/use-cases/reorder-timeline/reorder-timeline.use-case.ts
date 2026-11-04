import { TimelineEntry, type TimelineKind } from '@vfortin/content-domain';
import type {
  Clock,
  TimelineRepositories,
  TimelineUnitOfWork,
} from '@internal/content-application/lib/ports/content/content.ports';
import type { AdminTimelineView } from '@internal/content-application/lib/use-cases/list-admin-timeline/list-admin-timeline.use-case';

/**
 * Interface TimelineListChangeResult
 * @interface TimelineListChangeResult
 *
 * @description
 * List of one kind after a reorder or a deletion, and the rebuild revision queued with it.
 */
export interface TimelineListChangeResult extends AdminTimelineView {
  // #region Properties
  /**
   * Property revision
   * @readonly
   *
   * @description
   * Content revision queued for the site rebuild, or `null` when the order did not change.
   */
  readonly revision: number | null;
  // #endregion
}

/**
 * Class ReorderTimeline
 * @class ReorderTimeline
 *
 * @description
 * Applies a new order to the entries of one kind. The precondition is the list version rather than
 * the entries' versions: an order is a property of the list, a stale list (an entry created, deleted
 * or moved since) is refused as a whole, and editing an entry's text in another tab neither blocks a
 * reorder nor is invalidated by one.
 */
export class ReorderTimeline {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the transaction boundary and the request clock.
   *
   * @param {TimelineUnitOfWork} unitOfWork - Atomic timeline and outbox writes.
   * @param {Clock} clock - Rebuild request time.
   */
  public constructor(
    private readonly unitOfWork: TimelineUnitOfWork,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Checks and bumps the list version, then writes the moved positions and requests the rebuild; an
   * unchanged order still bumps the version (the client receives it) but queues no rebuild.
   *
   * @param {TimelineKind} kind - Kind of the list.
   * @param {number} expectedVersion - List version read by the client (`If-Match`).
   * @param {readonly string[]} ids - Every entry of the kind, in the wanted order.
   * @throws {VersionMismatchError} When the list changed since it was read.
   * @throws {DomainError} `content.timeline-order-invalid` when `ids` is not a permutation.
   * @returns {Promise<TimelineListChangeResult>} Ordered entries, list version and optional revision.
   */
  public execute(
    kind: TimelineKind,
    expectedVersion: number,
    ids: readonly string[],
  ): Promise<TimelineListChangeResult> {
    return this.unitOfWork.run(
      async ({
        entries,
        lists,
        buildRequests,
      }: TimelineRepositories): Promise<TimelineListChangeResult> => {
        // Bumping first both checks the precondition and locks the list until commit.
        const version: number = await lists.bump(kind, expectedVersion);
        const current: TimelineEntry[] = await entries.listByKind(kind);
        const moved: TimelineEntry[] = TimelineEntry.reorder(current, ids);
        if (moved.length > 0) await entries.move(moved);
        return {
          kind,
          version,
          entries: [...current].sort(
            (a: TimelineEntry, b: TimelineEntry): number => a.position - b.position,
          ),
          revision: moved.length > 0 ? await buildRequests.request(this.clock.now()) : null,
        };
      },
    );
  }
  // #endregion
}
