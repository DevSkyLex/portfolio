import type { TimelineEntry, TimelineKind } from '@vfortin/content-domain';
import { NotFoundError } from '@internal/content-application/lib/errors/application-error';
import type { TimelineEntryRepository } from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Function findTimelineEntry
 *
 * @description
 * Loads an entry of the supplied kind; an entry of the other kind is reported missing, so that a URL
 * of the experience list never edits an education entry.
 *
 * @param {TimelineEntryRepository} entries - Timeline entries.
 * @param {TimelineKind} kind - Kind named by the route.
 * @param {string} id - Entry identifier.
 * @throws {NotFoundError} When no entry of that kind has the identifier.
 * @returns {Promise<TimelineEntry>} Entry.
 */
export async function findTimelineEntry(
  entries: TimelineEntryRepository,
  kind: TimelineKind,
  id: string,
): Promise<TimelineEntry> {
  const entry: TimelineEntry | null = await entries.get(id);
  if (entry === null || entry.kind !== kind) {
    throw new NotFoundError('Timeline entry');
  }
  return entry;
}

/**
 * Class GetAdminTimelineEntry
 * @class GetAdminTimelineEntry
 *
 * @description
 * Loads one timeline entry for the administration editor.
 */
export class GetAdminTimelineEntry {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the entry repository.
   *
   * @param {TimelineEntryRepository} entries - Timeline entries.
   */
  public constructor(private readonly entries: TimelineEntryRepository) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Returns the entry, or rejects with `NotFoundError` when it is absent or of the other kind.
   *
   * @param {TimelineKind} kind - Kind named by the route.
   * @param {string} id - Entry identifier.
   * @returns {Promise<TimelineEntry>} Entry.
   */
  public execute(kind: TimelineKind, id: string): Promise<TimelineEntry> {
    return findTimelineEntry(this.entries, kind, id);
  }
  // #endregion
}
