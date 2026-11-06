import {
  TimelineEntry,
  type TimelineEntryDraft,
  type TimelineEntryRevision,
  type TimelineKind,
} from '@vfortin/content-domain';
import type {
  Clock,
  TimelineRepositories,
  TimelineUnitOfWork,
} from '@internal/content-application/lib/ports/content/content.ports';
import type { TimelineEntryChangeResult } from '@internal/content-application/lib/use-cases/create-timeline-entry/create-timeline-entry.use-case';
import { findTimelineEntry } from '@internal/content-application/lib/use-cases/get-admin-timeline-entry/get-admin-timeline-entry.use-case';

/**
 * Class ReviseTimelineEntry
 * @class ReviseTimelineEntry
 *
 * @description
 * Replaces an entry with optimistic locking and advances the content revision in the same
 * unit of work.
 */
export class ReviseTimelineEntry {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the transaction boundary and the request clock.
   *
   * @param {TimelineUnitOfWork} unitOfWork - Atomic timeline and revision writes.
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
   * Applies the draft to the entry if it still has `expectedVersion`; its position and the list
   * version are untouched, so a concurrent reorder neither conflicts with nor undoes the edit.
   *
   * @param {TimelineKind} kind - Kind named by the route.
   * @param {string} id - Entry identifier.
   * @param {number} expectedVersion - Version read before editing.
   * @param {TimelineEntryDraft} draft - New content.
   * @throws {NotFoundError} When the entry is absent or of the other kind.
   * @throws {VersionMismatchError} When the entry changed in the meantime.
   * @returns {Promise<TimelineEntryChangeResult>} Revised entry, new version and queued revision.
   */
  public async execute(
    kind: TimelineKind,
    id: string,
    expectedVersion: number,
    draft: TimelineEntryDraft,
  ): Promise<TimelineEntryChangeResult> {
    const revision: TimelineEntryRevision = TimelineEntry.revisionOf(draft);
    return this.unitOfWork.run(
      async ({
        entries,
        buildRequests,
      }: TimelineRepositories): Promise<TimelineEntryChangeResult> => {
        const entry: TimelineEntry = await findTimelineEntry(entries, kind, id);
        entry.revise(revision);
        const version: number = await entries.save(entry, expectedVersion);
        return { entry, version, revision: await buildRequests.request(this.clock.now()) };
      },
    );
  }
  // #endregion
}
