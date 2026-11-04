import type { AdminMessageStatus } from '@vfortin/contact-web-data-access';
import type { MessageStatusTag } from '@internal/contact-web-feature-admin/lib/models/message-status-tag/message-status-tag.interface';

/**
 * Constant MESSAGE_STATUS_TAGS
 *
 * @description
 * Status badges of the reading pane, after the D37 families: unread is information, read is a
 * completed state, archived is neutral (the outline badge: every status badge has the same hairline and
 * no fill).
 *
 * @type {Readonly<Record<AdminMessageStatus, MessageStatusTag>>}
 */
export const MESSAGE_STATUS_TAGS: Readonly<Record<AdminMessageStatus, MessageStatusTag>> = {
  received: { label: $localize`:@@admin.inbox.status.received:Non lu`, variant: 'info' },
  read: { label: $localize`:@@admin.inbox.status.read:Lu`, variant: 'success' },
  archived: { label: $localize`:@@admin.inbox.status.archived:Archivé`, variant: 'outline' },
};
