import type { TimelineEntryRequest } from '@vfortin/content-contracts';
import type { AdminTimelineEntry } from '@internal/content-web-data-access/lib/admin/models/admin-timeline-entry/admin-timeline-entry.interface';
import type { TimelineEntryDraft } from '@internal/content-web-data-access/lib/admin/models/timeline-entry-draft/timeline-entry-draft.interface';
import {
  emptyTimelineEntryDraft,
  toTimelineEntryDraft,
  toTimelineEntryRequest,
} from '@internal/content-web-data-access/lib/admin/utils/timeline-entry-draft/timeline-entry-draft.utils';

/**
 * Constant ENTRY
 *
 * @description
 * Stored ongoing entry without English description.
 */
const ENTRY: AdminTimelineEntry = {
  id: 'oaas',
  kind: 'experience',
  position: 0,
  version: 2,
  title: { fr: 'Développeur', en: 'Developer' },
  place: { fr: 'Tours', en: 'Tours' },
  description: { fr: 'Interfaces.' },
  start: { year: 2023, month: 9 },
  end: null,
  techs: ['angular'],
};

describe('toTimelineEntryDraft', (): void => {
  it('checks « En cours » for an entry without end and empties a missing English text', (): void => {
    const draft: TimelineEntryDraft = toTimelineEntryDraft(ENTRY);
    expect(draft).toMatchObject({
      startMonth: 9,
      startYear: 2023,
      ongoing: true,
      endMonth: null,
      endYear: null,
      description: { fr: 'Interfaces.', en: '' },
    });
    expect(toTimelineEntryDraft({ ...ENTRY, end: { year: 2026, month: 6 } })).toMatchObject({
      ongoing: false,
      endMonth: 6,
      endYear: 2026,
    });
  });
});

describe('toTimelineEntryRequest', (): void => {
  it('trims the texts, leaves out an empty English text and sends no end while ongoing', (): void => {
    const request: TimelineEntryRequest = toTimelineEntryRequest({
      ...toTimelineEntryDraft(ENTRY),
      title: { fr: '  Développeur ', en: '  ' },
      endMonth: 6,
      endYear: 2026,
      techs: [' vue ', ''],
    });
    expect(request).toEqual({
      title: { fr: 'Développeur' },
      place: { fr: 'Tours', en: 'Tours' },
      description: { fr: 'Interfaces.' },
      start: { year: 2023, month: 9 },
      end: null,
      techs: ['vue'],
    });
  });

  it('sends the chosen end, and 0 for a month left unchosen', (): void => {
    expect(
      toTimelineEntryRequest({
        ...toTimelineEntryDraft(ENTRY),
        ongoing: false,
        endYear: 2026,
        endMonth: 6,
      }).end,
    ).toEqual({ year: 2026, month: 6 });
    expect(toTimelineEntryRequest(emptyTimelineEntryDraft())).toMatchObject({
      start: { year: 0, month: 0 },
      end: { year: 0, month: 0 },
      techs: [],
    });
  });
});
