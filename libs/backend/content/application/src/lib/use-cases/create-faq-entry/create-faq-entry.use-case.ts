import { FaqEntry, type FaqEntryDraft, type FaqEntryRevision } from '@vfortin/content-domain';
import type {
  Clock,
  FaqRepositories,
  FaqUnitOfWork,
  IdGenerator,
} from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Interface FaqEntryChangeResult
 * @interface FaqEntryChangeResult
 *
 * @description
 * FAQ entry written by a command, its new version and the public content revision.
 */
export interface FaqEntryChangeResult {
  // #region Properties
  /**
   * Property entry
   * @readonly
   *
   * @description
   * Entry after the write.
   */
  readonly entry: FaqEntry;

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
 * Class CreateFaqEntry
 * @class CreateFaqEntry
 *
 * @description
 * Adds a question at the end of the FAQ and advances the content revision in the same unit of work.
 */
export class CreateFaqEntry {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the transaction boundary, the identifier source and the request clock.
   *
   * @param {FaqUnitOfWork} unitOfWork - Atomic FAQ and revision writes.
   * @param {IdGenerator} ids - Identifier of the new entry.
   * @param {Clock} clock - Rebuild request time.
   */
  public constructor(
    private readonly unitOfWork: FaqUnitOfWork,
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
   * which locks the list so that two creations never take the same position, and inserts the entry
   * after the last one.
   *
   * @param {FaqEntryDraft} draft - Content of the new entry.
   * @returns {Promise<FaqEntryChangeResult>} Created entry, version 1 and queued revision.
   */
  public async execute(draft: FaqEntryDraft): Promise<FaqEntryChangeResult> {
    const revision: FaqEntryRevision = FaqEntry.revisionOf(draft);
    return this.unitOfWork.run(
      async ({ entries, lists, buildRequests }: FaqRepositories): Promise<FaqEntryChangeResult> => {
        await lists.bump(null);
        const position: number = (await entries.list()).length;
        const entry: FaqEntry = FaqEntry.create({ id: this.ids.next(), position }, revision);
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
