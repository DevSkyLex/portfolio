import type {
  AdminTimelineEntryDto,
  AdminTimelineList as AdminTimelineListDto,
} from '@vfortin/content-contracts';
import {
  toAdminTimelineEntry,
  toAdminTimelineList,
} from '@internal/content-web-data-access/lib/admin/adapters/admin-timeline/admin-timeline.adapter';
import type { AdminTimelineEntry } from '@internal/content-web-data-access/lib/admin/models/admin-timeline-entry/admin-timeline-entry.interface';
import type { AdminTimelineList } from '@internal/content-web-data-access/lib/admin/models/admin-timeline-list/admin-timeline-list.interface';

/**
 * Function dto
 *
 * @description
 * Builds an administration entry DTO.
 *
 * @param {string} id - Identifier.
 * @param {number} position - Position.
 * @param {AdminTimelineEntryDto['end']} end - Last month.
 *
 * @returns {AdminTimelineEntryDto} Entry DTO.
 */
const dto = (
  id: string,
  position: number,
  end: AdminTimelineEntryDto['end'],
): AdminTimelineEntryDto => ({
  id,
  kind: 'experience',
  position,
  version: 2,
  title: { fr: 'Développeur', en: 'Developer' },
  place: { fr: 'Tours', en: 'Tours' },
  description: { fr: 'CRM.', en: 'CRM.' },
  start: { year: 2023, month: 3 },
  end,
  techs: ['codeigniter', 'php'],
});

describe('toAdminTimelineList', (): void => {
  it('keeps the list version and orders the entries by position', (): void => {
    const list: AdminTimelineListDto = {
      kind: 'experience',
      version: 4,
      totalItems: 2,
      member: [dto('kodoka', 1, { year: 2023, month: 4 }), dto('oaas', 0, null)],
    };
    const view: AdminTimelineList = toAdminTimelineList(list);
    expect(view).toMatchObject({ kind: 'experience', version: 4 });
    expect(view.entries.map((entry: AdminTimelineEntry): string => entry.id)).toEqual([
      'oaas',
      'kodoka',
    ]);
    expect(view.entries[0]?.end).toBeNull();
    expect(view.entries[1]?.end).toEqual({ year: 2023, month: 4 });
  });
});

describe('toAdminTimelineEntry', (): void => {
  it('leaves out an absent English text and copies the technologies', (): void => {
    const source: AdminTimelineEntryDto = { ...dto('kodoka', 1, null), title: { fr: 'Seul' } };
    const entry: AdminTimelineEntry = toAdminTimelineEntry(source);
    expect(entry.title).toEqual({ fr: 'Seul' });
    expect(entry.place).toEqual({ fr: 'Tours', en: 'Tours' });
    expect(entry.techs).toEqual(['codeigniter', 'php']);
    expect(entry.techs).not.toBe(source.techs);
  });
});
