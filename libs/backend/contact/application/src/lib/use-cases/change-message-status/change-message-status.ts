import type { ContactMessage } from '@vfortin/contact-domain';
import { NotFoundError } from '@internal/contact-application/lib/errors/application-error';
import type { ContactMessageRepository } from '@internal/contact-application/lib/ports/contact/contact.ports';

/**
 * Function changeMessageStatus
 *
 * @description
 * Loads a message, applies an immutable status transition and persists it with optimistic locking.
 * A missing identifier raises `NotFoundError`; a stale version is reported by the repository.
 * @param {ContactMessageRepository} messages - Repository that owns the message lookup and versioned write.
 * @param {string} id - Identifier of the message to transition.
 * @param {number} expectedVersion - Version observed by the caller before editing.
 * @param {(message: ContactMessage) => ContactMessage} change - Pure transition applied to the loaded message.
 * @returns {Promise<{ message: ContactMessage; version: number }>} Updated message and persisted version.
 */
export async function changeMessageStatus(
  messages: ContactMessageRepository,
  id: string,
  expectedVersion: number,
  change: (message: ContactMessage) => ContactMessage,
): Promise<{ message: ContactMessage; version: number }> {
  const message: ContactMessage | null = await messages.get(id);
  if (message === null) {
    throw new NotFoundError();
  }
  const next: ContactMessage = change(message);
  return { message: next, version: await messages.save(next, expectedVersion) };
}
