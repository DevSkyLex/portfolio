import type { ContactMessage } from '@vfortin/contact-domain';
import type { ContactMessageRepository } from '@internal/contact-application/lib/ports/contact/contact.ports';
import { changeMessageStatus } from '@internal/contact-application/lib/use-cases/change-message-status/change-message-status';

/**
 * Class ArchiveContactMessage
 * @class ArchiveContactMessage
 *
 * @description
 * Archives an inbox message through the shared version-checked status transition.
 */
export class ArchiveContactMessage {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the repository used to load and version the target message.
   * @param {ContactMessageRepository} messages - Repository that persists inbox messages.
   */
  public constructor(private readonly messages: ContactMessageRepository) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Archives the identified message if its persisted version still matches the caller's version.
   * @param {string} id - Identifier of the message to archive.
   * @param {number} expectedVersion - Version read by the caller before the archive request.
   * @returns {Promise<{ message: ContactMessage; version: number }>} Archived message and new persisted version.
   */
  public execute(
    id: string,
    expectedVersion: number,
  ): Promise<{ message: ContactMessage; version: number }> {
    return changeMessageStatus(this.messages, id, expectedVersion, (message): ContactMessage =>
      message.archive(),
    );
  }
  // #endregion
}
