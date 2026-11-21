import { FaqEntry, type FaqEntryDraft, type FaqEntryRevision } from '@vfortin/content-domain';
import type {
  Clock,
  FaqRepositories,
  FaqUnitOfWork,
} from '@internal/content-application/lib/ports/content/content.ports';
import type { FaqEntryChangeResult } from '@internal/content-application/lib/use-cases/create-faq-entry/create-faq-entry.use-case';
import { findFaqEntry } from '@internal/content-application/lib/use-cases/get-admin-faq-entry/get-admin-faq-entry.use-case';

/**
 * Class ReviseFaqEntry
 * @class ReviseFaqEntry
 *
 * @description
 * Replaces a FAQ entry with optimistic locking and advances the content revision in the same unit of
 * work.
 */
export class ReviseFaqEntry {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the transaction boundary and the request clock.
   *
   * @param {FaqUnitOfWork} unitOfWork - Atomic FAQ and revision writes.
   * @param {Clock} clock - Rebuild request time.
   */
  public constructor(
    private readonly unitOfWork: FaqUnitOfWork,
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
   * @param {string} id - Entry identifier.
   * @param {number} expectedVersion - Version read before editing.
   * @param {FaqEntryDraft} draft - New content.
   * @throws {NotFoundError} When the entry is absent.
   * @throws {VersionMismatchError} When the entry changed in the meantime.
   * @returns {Promise<FaqEntryChangeResult>} Revised entry, new version and queued revision.
   */
  public async execute(
    id: string,
    expectedVersion: number,
    draft: FaqEntryDraft,
  ): Promise<FaqEntryChangeResult> {
    const revision: FaqEntryRevision = FaqEntry.revisionOf(draft);
    return this.unitOfWork.run(
      async ({ entries, buildRequests }: FaqRepositories): Promise<FaqEntryChangeResult> => {
        const entry: FaqEntry = await findFaqEntry(entries, id);
        entry.revise(revision);
        const version: number = await entries.save(entry, expectedVersion);
        return { entry, version, revision: await buildRequests.request(this.clock.now()) };
      },
    );
  }
  // #endregion
}
