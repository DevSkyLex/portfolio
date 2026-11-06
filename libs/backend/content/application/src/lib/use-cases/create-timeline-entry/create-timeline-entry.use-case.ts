import {
  TimelineEntry,
  type TimelineEntryDraft,
  type TimelineEntryRevision,
  type TimelineKind,
} from '@vfortin/content-domain';
import type {
  Clock,
  IdGenerator,
  TimelineRepositories,
  TimelineUnitOfWork,
} from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Interface TimelineEntryChangeResult
 * @interface TimelineEntryChangeResult
 *
 * @description
 * Entry written by a command, its new version and the public content revision.
 */
export interface TimelineEntryChangeResult {
  // #region Properties
  /**
   * Property entry
   * @readonly
   *
   * @description
   * Entry after the write.
   */
  readonly entry: TimelineEntry;

  /**
   * Property version
   * @readonly
   *
   * @description
   * Stored version of the entry (its `ETag`).
   */
  readonly version: number;

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Content revision after the change.
   */
  readonly revision: number;
  // #endregion
}

/**
 * Class CreateTimelineEntry
 * @class CreateTimelineEntry
 *
 * @description
 * Adds an entry at the end of its kind and advances the content revision in the same unit of work.
 */
export class CreateTimelineEntry {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the transaction boundary, the identifier source and the request clock.
   *
   * @param {TimelineUnitOfWork} unitOfWork - Atomic timeline and revision writes.
   * @param {IdGenerator} ids - Identifier of the new entry.
   * @param {Clock} clock - Rebuild request time.
   */
  public constructor(
    private readonly unitOfWork: TimelineUnitOfWork,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Validates the draft first (nothing is locked for an invalid one), then bumps the list version,
   * which locks the kind's list so that two creations never take the same position, and inserts the
   * entry after the last one.
   *
   * @param {TimelineKind} kind - Kind of the new entry.
   * @param {TimelineEntryDraft} draft - Content of the new entry.
   * @returns {Promise<TimelineEntryChangeResult>} Created entry, version 1 and queued revision.
   */
  public async execute(
    kind: TimelineKind,
    draft: TimelineEntryDraft,
  ): Promise<TimelineEntryChangeResult> {
    const revision: TimelineEntryRevision = TimelineEntry.revisionOf(draft);
    return this.unitOfWork.run(
      async ({
        entries,
        lists,
        buildRequests,
      }: TimelineRepositories): Promise<TimelineEntryChangeResult> => {
        await lists.bump(kind, null);
        const position: number = (await entries.listByKind(kind)).length;
        const entry: TimelineEntry = TimelineEntry.create(
          { id: this.ids.next(), kind, position },
          revision,
        );
        await entries.insert(entry);
        return {
          entry,
          version: entry.version,
          revision: await buildRequests.request(this.clock.now()),
        };
      },
    );
  }
  // #endregion
}
