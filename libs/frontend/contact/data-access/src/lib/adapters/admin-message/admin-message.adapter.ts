import type { ContactMessageDto } from '@vfortin/contact-contracts';
import type { AdminMessage } from '@internal/contact-web-data-access/lib/models/admin-message/admin-message.type';
/** Function toAdminMessage
 *
 * @description
 * Copies the supported inbox fields so future transport additions do not become view dependencies.
 * @param {ContactMessageDto} message - Authoritative API record.
 * @returns {AdminMessage} Immutable presentation projection.
 */
export function toAdminMessage(message: ContactMessageDto): AdminMessage {
  return {
    id: message.id,
    name: message.name,
    company: message.company,
    email: message.email,
    subject: message.subject,
    message: message.message,
    locale: message.locale,
    status: message.status,
    receivedAt: message.receivedAt,
    purgeAt: message.purgeAt,
    version: message.version,
  };
}
