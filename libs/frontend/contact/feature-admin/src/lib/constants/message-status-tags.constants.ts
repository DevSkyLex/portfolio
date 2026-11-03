import type { AdminMessageStatus } from '@vfortin/contact-web-data-access';
import type { MessageStatusTag } from '@internal/contact-web-feature-admin/lib/models/message-status-tag/message-status-tag.interface';

/**
 * Constant MESSAGE_STATUS_TAGS
 *
 * @description
 * Status badges of the reading pane, after the D37 families: unread is information, read is a
 * completed state, archived is neutral.
 *
 * @type {Readonly<Record<AdminMessageStatus, MessageStatusTag>>}
 */
export const MESSAGE_STATUS_TAGS: Readonly<Record<AdminMessageStatus, MessageStatusTag>> = {
  received: { label: 'Non lu', variant: 'info' },
  read: { label: 'Lu', variant: 'success' },
  archived: { label: 'Archivé', variant: 'default' },
};
