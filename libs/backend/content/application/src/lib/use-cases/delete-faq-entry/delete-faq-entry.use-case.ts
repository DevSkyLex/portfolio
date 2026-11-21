import type { FaqEntry } from '@vfortin/content-domain';
import type {
  Clock,
  FaqRepositories,
  FaqUnitOfWork,
} from '@internal/content-application/lib/ports/content/content.ports';
import { findFaqEntry } from '@internal/content-application/lib/use-cases/get-admin-faq-entry/get-admin-faq-entry.use-case';
import type { FaqListChangeResult } from '@internal/content-application/lib/use-cases/reorder-faq/reorder-faq.use-case';

/**
 * Class DeleteFaqEntry
 * @class DeleteFaqEntry
 *
 * @description
 * Deletes a FAQ entry with optimistic locking, closes the gap in the positions and requests the
 * content revision in the same unit of work.
 */
export class DeleteFaqEntry {
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
   * Locks the list (version bump), deletes the entry if it still has `expectedVersion`, then
   * renumbers the remaining entries from 0.
   *
   * @param {string} id - Entry identifier.
   * @param {number} expectedVersion - Entry version read before deleting.
   * @throws {NotFoundError} When the entry is absent.
   * @throws {VersionMismatchError} When the entry changed in the meantime.
   * @returns {Promise<FaqListChangeResult>} Remaining entries, new list version and queued revision.
   */
  public execute(id: string, expectedVersion: number): Promise<FaqListChangeResult> {
    return this.unitOfWork.run(
      async ({ entries, lists, buildRequests }: FaqRepositories): Promise<FaqListChangeResult> => {
        await findFaqEntry(entries, id);
        const listVersion: number = await lists.bump(null);
        await entries.delete(id, expectedVersion);
        const remaining: FaqEntry[] = await entries.list();
        const moved: FaqEntry[] = remaining.filter((entry: FaqEntry, position: number): boolean => {
          if (entry.position === position) return false;
          entry.moveTo(position);
          return true;
        });
        if (moved.length > 0) await entries.move(moved);
        return {
          version: listVersion,
          entries: remaining,
          revision: await buildRequests.request(this.clock.now()),
        };
      },
    );
  }
  // #endregion
}
