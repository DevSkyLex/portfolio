import type { FaqEntry } from '@vfortin/content-domain';
import { NotFoundError } from '@internal/content-application/lib/errors/application-error';
import type { FaqEntryRepository } from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Function findFaqEntry
 *
 * @description
 * Loads a FAQ entry by identifier.
 *
 * @param {FaqEntryRepository} entries - FAQ entries.
 * @param {string} id - Entry identifier.
 * @throws {NotFoundError} When no entry has the identifier.
 * @returns {Promise<FaqEntry>} Entry.
 */
export async function findFaqEntry(entries: FaqEntryRepository, id: string): Promise<FaqEntry> {
  const entry: FaqEntry | null = await entries.get(id);
  if (entry === null) {
    throw new NotFoundError('FAQ entry');
  }
  return entry;
}

/**
 * Class GetAdminFaqEntry
 * @class GetAdminFaqEntry
 *
 * @description
 * Loads one FAQ entry for the administration editor.
 */
export class GetAdminFaqEntry {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the entry repository.
   *
   * @param {FaqEntryRepository} entries - FAQ entries.
   */
  public constructor(private readonly entries: FaqEntryRepository) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Returns the entry, or rejects with `NotFoundError` when it is absent.
   *
   * @param {string} id - Entry identifier.
   * @returns {Promise<FaqEntry>} Entry.
   */
  public execute(id: string): Promise<FaqEntry> {
    return findFaqEntry(this.entries, id);
  }
  // #endregion
}
