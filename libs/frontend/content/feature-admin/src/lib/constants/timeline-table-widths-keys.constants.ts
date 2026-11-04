import type { TimelineKind } from '@vfortin/content-web-data-access/admin';

/**
 * Constant TIMELINE_TABLE_WIDTHS_KEYS
 *
 * @description
 * Storage keys of the resized column widths of the experience and education tables. They are keyed
 * by kind, not by the translated section name, so both builds share them; the values keep the keys
 * written before the admin was localized, so stored widths survive.
 *
 * @type {Readonly<Record<TimelineKind, string>>}
 */
export const TIMELINE_TABLE_WIDTHS_KEYS: Readonly<Record<TimelineKind, string>> = {
  experience: 'portfolio.admin.table.timeline.expériences.v1',
  education: 'portfolio.admin.table.timeline.formations.v1',
};
