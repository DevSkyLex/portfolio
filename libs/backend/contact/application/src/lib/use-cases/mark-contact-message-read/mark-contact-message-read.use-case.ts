import type { ContactMessage } from '@vfortin/contact-domain';
import type { ContactMessageRepository } from '@internal/contact-application/lib/ports/contact/contact.ports';
import { changeMessageStatus } from '@internal/contact-application/lib/use-cases/change-message-status/change-message-status';

/**
 * Class MarkContactMessageRead
 * @class MarkContactMessageRead
 *
 * @description
 * Marks a received inbox message as read while preserving optimistic-lock conflict handling.
 */
export class MarkContactMessageRead {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the repository used for the lookup and versioned write.
   * @param {ContactMessageRepository} messages - Repository that owns inbox persistence.
   */
  public constructor(private readonly messages: ContactMessageRepository) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Applies the domain read transition to a message only if its version has not changed.
   * @param {string} id - Identifier of the message to mark read.
   * @param {number} expectedVersion - Version observed when the caller loaded the message.
   * @returns {Promise<{ message: ContactMessage; version: number }>} Resulting message and persisted version.
   */
  public execute(
    id: string,
    expectedVersion: number,
  ): Promise<{ message: ContactMessage; version: number }> {
    return changeMessageStatus(this.messages, id, expectedVersion, (message): ContactMessage =>
      message.markRead(),
    );
  }
  // #endregion
}
