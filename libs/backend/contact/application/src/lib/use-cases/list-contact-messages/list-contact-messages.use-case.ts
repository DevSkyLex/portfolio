import type {
  ContactMessageRepository,
  MessagePage,
  MessageQuery,
} from '@internal/contact-application/lib/ports/contact/contact.ports';

/**
 * Constant MAX_PAGE_SIZE
 * @readonly
 *
 * @description
 * Upper bound applied to inbox queries so one request cannot fetch an unbounded page.
 *
 * @type {number}
 */
export const MAX_PAGE_SIZE: number = 50;

/**
 * Class ListContactMessages
 * @class ListContactMessages
 *
 * @description
 * Retrieves a bounded, newest-first page of messages for the administrator inbox.
 */
export class ListContactMessages {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the repository that serves inbox queries.
   * @param {ContactMessageRepository} messages - Repository that owns inbox ordering and pagination.
   */
  public constructor(private readonly messages: ContactMessageRepository) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Normalizes the requested page to a positive integer and clamps page size to the supported range.
   * @param {MessageQuery} query - Requested status filter and pagination values.
   * @returns {Promise<MessagePage>} Page of matching messages and total count.
   */
  public execute(query: MessageQuery): Promise<MessagePage> {
    return this.messages.list({
      status: query.status,
      page: Math.max(1, Math.floor(query.page)),
      pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(query.pageSize))),
    });
  }
  // #endregion
}
