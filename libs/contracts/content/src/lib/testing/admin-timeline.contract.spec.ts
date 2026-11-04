import {
  AdminTimelineEntryDtoSchema,
  AdminTimelineListSchema,
  TIMELINE_ENTRY_LIMITS,
  type TimelineEntryRequest,
  TimelineEntryRequestSchema,
  TimelineKindSchema,
  TimelineOrderRequestSchema,
} from '@internal/content-contracts/lib/admin-timeline.contract';
import list from '@internal/content-contracts/lib/testing/admin-timeline.fixture.json';

/**
 * Constant entry
 *
 * @description
 * First entry of the fixture list.
 */
const entry: (typeof list.member)[number] = list.member[0] as (typeof list.member)[number];

/**
 * Function requestOf
 *
 * @description
 * Keeps the editable fields of an administrator entry.
 *
 * @param {typeof entry} dto - Entry of the fixture.
 * @returns {Record<string, unknown>} Request payload.
 */
function requestOf(dto: typeof entry): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(dto).filter(
      ([key]: [string, unknown]): boolean => !['id', 'kind', 'position', 'version'].includes(key),
    ),
  );
}

describe('AdminTimelineListSchema', (): void => {
  it('accepts the fixture shared by the service and the admin screen', (): void => {
    expect(AdminTimelineListSchema.parse(list).member.map((e): string => e.id)).toEqual([
      'object-as-a-service',
      'kodoka',
    ]);
    expect(AdminTimelineEntryDtoSchema.parse(entry).end).toBeNull();
  });

  it('rejects an unknown kind and a version below 1', (): void => {
    expect(AdminTimelineListSchema.safeParse({ ...list, kind: 'hobby' }).success).toBe(false);
    expect(AdminTimelineListSchema.safeParse({ ...list, version: 0 }).success).toBe(false);
    expect(TimelineKindSchema.safeParse('education').success).toBe(true);
  });
});

describe('TimelineEntryRequestSchema', (): void => {
  it('accepts the request built from the fixture, trims the texts and allows an English gap', (): void => {
    const parsed: TimelineEntryRequest = TimelineEntryRequestSchema.parse({
      ...requestOf(entry),
      title: { fr: '  Développeur  ' },
      end: { year: 2023, month: 9 },
    });
    expect(parsed.title).toEqual({ fr: 'Développeur' });
    expect(parsed.end).toEqual({ year: 2023, month: 9 });
  });

  it('accepts the exact bounds', (): void => {
    expect(
      TimelineEntryRequestSchema.safeParse({
        ...requestOf(entry),
        title: { fr: 'x'.repeat(TIMELINE_ENTRY_LIMITS.title), en: 'y'.repeat(120) },
        place: { fr: 'x'.repeat(TIMELINE_ENTRY_LIMITS.place) },
        description: { fr: 'x'.repeat(TIMELINE_ENTRY_LIMITS.description) },
        start: { year: 1990, month: 1 },
        end: { year: 2100, month: 12 },
        techs: Array.from({ length: 12 }, (_, i): string => `t${i}`),
      }).success,
    ).toBe(true);
  });

  it.each([
    ['an empty French title', { title: { fr: '   ' } }, 'title.fr'],
    ['a title over 120 characters', { title: { fr: 'x'.repeat(121) } }, 'title.fr'],
    [
      'an English place over 120 characters',
      { place: { fr: 'L', en: 'x'.repeat(121) } },
      'place.en',
    ],
    [
      'a description over 600 characters',
      { description: { fr: 'x'.repeat(601) } },
      'description.fr',
    ],
    ['a month 13', { start: { year: 2023, month: 13 } }, 'start.month'],
    ['a year before 1990', { start: { year: 1989, month: 1 } }, 'start.year'],
    ['an end before the start', { end: { year: 2023, month: 8 } }, 'end'],
    ['a malformed tech key', { techs: ['Vue.js'] }, 'techs.0'],
    ['13 techs', { techs: Array.from({ length: 13 }, (_, i): string => `t${i}`) }, 'techs'],
  ])('rejects %s at its path', (_label, override, path): void => {
    const result: ReturnType<typeof TimelineEntryRequestSchema.safeParse> =
      TimelineEntryRequestSchema.safeParse({ ...requestOf(entry), ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue): string => issue.path.join('.'))).toContain(path);
  });
});

describe('TimelineOrderRequestSchema', (): void => {
  it('accepts distinct identifiers and rejects a repeated or empty one', (): void => {
    expect(TimelineOrderRequestSchema.parse({ ids: ['a', 'b'] }).ids).toEqual(['a', 'b']);
    expect(TimelineOrderRequestSchema.safeParse({ ids: ['a', 'a'] }).success).toBe(false);
    expect(TimelineOrderRequestSchema.safeParse({ ids: [''] }).success).toBe(false);
    expect(
      TimelineOrderRequestSchema.safeParse({
        ids: Array.from({ length: 101 }, (_, i): string => `e${i}`),
      }).success,
    ).toBe(false);
  });
});
