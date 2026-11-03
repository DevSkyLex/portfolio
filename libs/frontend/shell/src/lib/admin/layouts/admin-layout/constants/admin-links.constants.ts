import { lucideFolderKanban, lucideInbox } from '@ng-icons/lucide';
import type { AdminLink } from '@internal/web-shell/lib/admin/layouts/admin-layout/models/admin-link/admin-link.interface';

/**
 * Constant ADMIN_LINKS
 *
 * @description
 * Administration sections shown in the sidebar, which turns into a top bar below 1024px, and in the
 * palette's "Aller à" group.
 *
 * @type {readonly AdminLink[]}
 */
export const ADMIN_LINKS: readonly AdminLink[] = [
  { path: '/admin/projects', label: 'Projets', icon: lucideFolderKanban },
  { path: '/admin/messages', label: 'Messages', icon: lucideInbox },
];

/**
 * Constant ADMIN_MESSAGES_PATH
 *
 * @description
 * Section whose sidebar entry carries the unread message count.
 *
 * @type {string}
 */
export const ADMIN_MESSAGES_PATH = '/admin/messages' as const;
