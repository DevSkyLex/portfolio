import type { TimelineEntry, TimelineKind } from '@vfortin/content-domain';
import type {
  Clock,
  TimelineRepositories,
  TimelineUnitOfWork,
} from '@internal/content-application/lib/ports/content/content.ports';
import { findTimelineEntry } from '@internal/content-application/lib/use-cases/get-admin-timeline-entry/get-admin-timeline-entry.use-case';
import type { TimelineListChangeResult } from '@internal/content-application/lib/use-cases/reorder-timeline/reorder-timeline.use-case';

/**
 * Class DeleteTimelineEntry
 * @class DeleteTimelineEntry
 *
 * @description
 * Deletes an entry with optimistic locking, closes the gap in its kind's positions and requests the
 * site rebuild in the same unit of work.
 */
export class DeleteTimelineEntry {
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
   * Locks the kind's list (version bump), deletes the entry if it still has `expectedVersion`, then
   * renumbers the remaining entries from 0.
   *
   * @param {TimelineKind} kind - Kind named by the route.
   * @param {string} id - Entry identifier.
   * @param {number} expectedVersion - Entry version read before deleting.
   * @throws {NotFoundError} When the entry is absent or of the other kind.
   * @throws {VersionMismatchError} When the entry changed in the meantime.
   * @returns {Promise<TimelineListChangeResult>} Remaining entries, new list version and queued
   * revision.
   */
  public execute(
    kind: TimelineKind,
    id: string,
    expectedVersion: number,
  ): Promise<TimelineListChangeResult> {
    return this.unitOfWork.run(
      async ({
        entries,
        lists,
        buildRequests,
      }: TimelineRepositories): Promise<TimelineListChangeResult> => {
        await findTimelineEntry(entries, kind, id);
        const listVersion: number = await lists.bump(kind, null);
        await entries.delete(id, expectedVersion);
        const remaining: TimelineEntry[] = await entries.listByKind(kind);
        const moved: TimelineEntry[] = remaining.filter(
          (entry: TimelineEntry, position: number): boolean => {
            if (entry.position === position) return false;
            entry.moveTo(position);
            return true;
          },
        );
        if (moved.length > 0) await entries.move(moved);
        return {
          kind,
          version: listVersion,
          entries: remaining,
          revision: await buildRequests.request(this.clock.now()),
        };
      },
    );
  }
  // #endregion
}
