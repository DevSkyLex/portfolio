import { NotFoundError } from '@internal/contact-application/lib/errors/application-error';
import type { ContactMessageRepository } from '@internal/contact-application/lib/ports/contact/contact.ports';

/**
 * Class DeleteContactMessage
 * @class DeleteContactMessage
 *
 * @description
 * Erases a contact message and its associated notification records on an administrator request.
 */
export class DeleteContactMessage {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the repository that performs message erasure.
   * @param {ContactMessageRepository} messages - Repository that deletes messages and linked notifications.
   */
  public constructor(private readonly messages: ContactMessageRepository) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Removes the identified message; a missing message is reported as `NotFoundError`.
   * @param {string} id - Identifier of the message to erase.
   * @returns {Promise<void>} Completion after erasure.
   */
  public async execute(id: string): Promise<void> {
    if (!(await this.messages.delete(id))) {
      throw new NotFoundError();
    }
  }
  // #endregion
}
