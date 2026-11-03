import type { ContactMessageDto } from '@vfortin/contact-contracts';
import type { ContactMessage, ContactMessageProps } from '@vfortin/contact-domain';

/**
 * Function toContactMessageDto
 *
 * @description
 * Maps the domain snapshot to the public/admin contract shape and serializes timestamps as ISO strings.
 * The optional version lets optimistic-locking endpoints present the version returned by persistence.
 * @param {ContactMessage} message - Domain message to expose.
 * @param {number} version - Version to include; defaults to the domain snapshot version.
 * @returns {ContactMessageDto} Transport representation of the message.
 */
export function toContactMessageDto(
  message: ContactMessage,
  version: number = message.version,
): ContactMessageDto {
  const m: ContactMessageProps = message.snapshot();
  return {
    id: m.id,
    name: m.name,
    company: m.company,
    email: m.email,
    subject: m.subject,
    message: m.body,
    locale: m.locale,
    status: m.status,
    receivedAt: m.receivedAt.toISOString(),
    purgeAt: m.purgeAt.toISOString(),
    version,
  };
}
