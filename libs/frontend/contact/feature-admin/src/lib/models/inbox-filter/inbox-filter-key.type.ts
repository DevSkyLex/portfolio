import type { AdminMessageStatus } from '@vfortin/contact-web-data-access';

/**
 * Type InboxFilterKey
 * @type InboxFilterKey
 *
 * @description
 * Value of an inbox status filter: one message status, or `all` for every status (the toggle group
 * cannot press a `null` value).
 *
 * @type {AdminMessageStatus | 'all'}
 */
export type InboxFilterKey = AdminMessageStatus | 'all';
