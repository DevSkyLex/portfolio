import type { FaqEntry } from '@vfortin/content-domain';
import type {
  FaqEntryRepository,
  FaqListRepository,
} from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Interface AdminFaqView
 * @interface AdminFaqView
 *
 * @description
 * FAQ entries in their editorial order with the list version a reorder must quote.
 */
export interface AdminFaqView {
  // #region Properties
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
  readonly entries: readonly FaqEntry[];
  // #endregion
}

/**
 * Class ListAdminFaq
 * @class ListAdminFaq
 *
 * @description
 * Lists the FAQ entries for the administration.
 */
export class ListAdminFaq {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the entry and list version repositories.
   *
   * @param {FaqEntryRepository} entries - FAQ entries.
   * @param {FaqListRepository} lists - List version.
   */
  public constructor(
    private readonly entries: FaqEntryRepository,
    private readonly lists: FaqListRepository,
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
   * @returns {Promise<AdminFaqView>} Version and ordered entries.
   */
  public async execute(): Promise<AdminFaqView> {
    const version: number = await this.lists.version();
    return { version, entries: await this.entries.list() };
  }
  // #endregion
}
