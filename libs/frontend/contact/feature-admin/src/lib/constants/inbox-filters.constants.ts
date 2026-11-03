import type { InboxFilter } from '@internal/contact-web-feature-admin/lib/models/inbox-filter/inbox-filter.interface';

/**
 * Constant INBOX_FILTERS
 *
 * @description
 * Status filters of the inbox title bar, unread first as the store starts on them.
 *
 * @type {readonly InboxFilter[]}
 */
export const INBOX_FILTERS: readonly InboxFilter[] = [
  { key: 'received', label: 'Non lus', status: 'received' },
  { key: 'read', label: 'Lus', status: 'read' },
  { key: 'archived', label: 'Archivés', status: 'archived' },
  { key: 'all', label: 'Tous', status: null },
];
