import type { AdminProject } from '@vfortin/content-web-data-access/admin';

/**
 * Type ProjectView
 * @type ProjectView
 *
 * @description
 * Status filter of the project list: every project, or one publication status.
 */
export type ProjectView = 'all' | AdminProject['status'];
