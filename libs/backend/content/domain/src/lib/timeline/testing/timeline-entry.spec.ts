import { DomainError, InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';
import {
  TimelineEntry,
  type TimelineEntryDraft,
  type TimelineEntryProps,
  type TimelineEntryRevision,
} from '@internal/content-domain/lib/timeline/timeline-entry';

/**
 * Constant DRAFT
 *
 * @description
 * Complete bilingual draft of an ongoing experience.
 */
const DRAFT: TimelineEntryDraft = {
  title: { fr: '  Développeur  ', en: 'Developer' },
  place: { fr: 'Ville-Exemple', en: 'Ville-Exemple' },
  description: { fr: 'Interfaces Angular.', en: 'Angular interfaces.' },
  start: { year: 2023, month: 9 },
  end: null,
  techs: ['angular', 'django'],
};

/**
 * Function entry
 *
 * @description
 * Creates an entry of the experience kind at the supplied position.
 *
 * @param {string} id - Entry identifier.
 * @param {number} position - Position within the kind.
 * @returns {TimelineEntry} New entry.
 */
function entry(id: string, position: number): TimelineEntry {
  return TimelineEntry.create(
    { id, kind: 'experience', position },
    TimelineEntry.revisionOf(DRAFT),
  );
}

/**
 * Function failure
 *
 * @description
 * Runs a domain call expected to throw and returns its error.
 *
 * @param {() => unknown} call - Call to run.
 * @returns {DomainError} Thrown error.
 */
function failure(call: () => unknown): DomainError {
  try {
    call();
  } catch (error) {
    if (error instanceof DomainError) return error;
    throw error;
  }
  throw new Error('expected a DomainError');
}

describe('TimelineEntry', (): void => {
  it('creates a complete entry at version 1 with trimmed texts', (): void => {
    const created: TimelineEntry = entry('oaas', 2);
    expect(created.version).toBe(1);
    expect(created.position).toBe(2);
    expect(created.title.toProps()).toEqual({ fr: 'Développeur', en: 'Developer' });
    expect(created.period.isOngoing()).toBe(true);
    expect(created.missingFor(['fr', 'en'])).toEqual([]);
  });

  it('refuses a creation without English texts, listing them', (): void => {
    const error: DomainError = failure(() =>
      TimelineEntry.create(
        { id: 'x', kind: 'education', position: 0 },
        TimelineEntry.revisionOf({
          ...DRAFT,
          title: { fr: 'Titre' },
          place: { fr: 'Lieu', en: ' ' },
        }),
      ),
    );
    expect(error.code).toBe('content.timeline-entry-incomplete');
    expect(error.details).toEqual(['title.en', 'place.en']);
  });

  it.each([
    ['an empty French title', { title: { fr: '  ', en: 'T' } }, 'title.fr'],
    ['a title over 120 characters', { title: { fr: 'x'.repeat(121), en: 'T' } }, 'title.fr'],
    [
      'an English place over 120 characters',
      { place: { fr: 'L', en: 'x'.repeat(121) } },
      'place.en',
    ],
    [
      'a description over 600 characters',
      { description: { fr: 'x'.repeat(601), en: 'D' } },
      'description.fr',
    ],
    ['a start month out of range', { start: { year: 2023, month: 13 } }, 'start'],
    ['a start year before 1990', { start: { year: 1989, month: 1 } }, 'start'],
    ['an end before the start', { end: { year: 2023, month: 8 } }, 'end'],
  ])('refuses %s under its contract field', (_label, override, field): void => {
    const error: DomainError = failure(() => TimelineEntry.revisionOf({ ...DRAFT, ...override }));
    expect(error).toBeInstanceOf(InvalidValueError);
    expect(error.details).toEqual([field]);
  });

  it('accepts an end equal to the start and exact bounds', (): void => {
    const revision: TimelineEntryRevision = TimelineEntry.revisionOf({
      ...DRAFT,
      title: { fr: 'x'.repeat(120), en: 'y'.repeat(120) },
      description: { fr: 'x'.repeat(600), en: 'y'.repeat(600) },
      end: { year: 2023, month: 9 },
      techs: Array.from({ length: 12 }, (_, i): string => `t${i}`),
    });
    expect(revision.period.end).toEqual({ year: 2023, month: 9 });
  });

  it.each([
    ['malformed', ['Vue.js']],
    ['repeated', ['php', 'php']],
    ['too many', Array.from({ length: 13 }, (_, i): string => `t${i}`)],
  ])('refuses %s technology keys', (_label, techs): void => {
    expect(
      failure(() => entry('x', 0).revise({ ...entry('x', 0).snapshot(), techs })).details,
    ).toEqual(['techs']);
  });

  it('revises the content and keeps identity, position and version', (): void => {
    const subject: TimelineEntry = entry('oaas', 1);
    subject.revise(
      TimelineEntry.revisionOf({ ...DRAFT, end: { year: 2026, month: 6 }, techs: ['php'] }),
    );
    const props: TimelineEntryProps = subject.snapshot();
    expect(props).toMatchObject({ id: 'oaas', kind: 'experience', position: 1, version: 1 });
    expect(props.period.end).toEqual({ year: 2026, month: 6 });
    expect(props.techs).toEqual(['php']);
  });

  it('refuses a revision that removes an English text and leaves the entry unchanged', (): void => {
    const subject: TimelineEntry = entry('oaas', 0);
    const error: DomainError = failure(() =>
      subject.revise(TimelineEntry.revisionOf({ ...DRAFT, description: { fr: 'Seul' } })),
    );
    expect(error.details).toEqual(['description.en']);
    expect(subject.description.en).toBe('Angular interfaces.');
  });

  it('rehydrates a stored row without English and rejects invalid persisted values', (): void => {
    const stored: TimelineEntryProps = { ...entry('a', 0).snapshot(), version: 4 };
    expect(TimelineEntry.rehydrate(stored).version).toBe(4);
    expect(failure(() => TimelineEntry.rehydrate({ ...stored, position: -1 })).details).toEqual([
      'position',
    ]);
    expect(failure(() => TimelineEntry.rehydrate({ ...stored, version: 0 })).details).toEqual([
      'version',
    ]);
  });

  it('reorders a kind and returns only the moved entries', (): void => {
    const [a, b, c] = [entry('a', 0), entry('b', 1), entry('c', 2)];
    const moved: TimelineEntry[] = TimelineEntry.reorder([a, b, c], ['a', 'c', 'b']);
    expect(moved.map((e: TimelineEntry): string => e.id)).toEqual(['c', 'b']);
    expect([a.position, b.position, c.position]).toEqual([0, 2, 1]);
    expect(c.version).toBe(1);
  });

  it.each([
    ['a missing entry', ['a', 'b']],
    ['a repeated entry', ['a', 'b', 'b']],
    ['an unknown entry', ['a', 'b', 'z']],
  ])('refuses an order with %s', (_label, ids): void => {
    const entries: TimelineEntry[] = [entry('a', 0), entry('b', 1), entry('c', 2)];
    const error: DomainError = failure(() => TimelineEntry.reorder(entries, ids));
    expect(error.code).toBe('content.timeline-order-invalid');
    expect(error.details).toEqual(['ids']);
  });

  it('sorts education first, then chronologically whatever the position, then by identifier', (): void => {
    const education: TimelineEntry = TimelineEntry.create(
      { id: 'edu', kind: 'education', position: 5 },
      TimelineEntry.revisionOf(DRAFT),
    );
    const early: TimelineEntry = TimelineEntry.create(
      { id: 'early', kind: 'experience', position: 9 },
      TimelineEntry.revisionOf({ ...DRAFT, start: { year: 2020, month: 1 } }),
    );
    const ended: TimelineEntry = TimelineEntry.create(
      { id: 'ended', kind: 'experience', position: 3 },
      TimelineEntry.revisionOf({ ...DRAFT, end: { year: 2024, month: 6 } }),
    );
    // Same ongoing period as « b-same »: the identifier decides.
    expect(
      [entry('c-same', 0), entry('b-same', 1), education, early, ended]
        .sort(TimelineEntry.compare)
        .map((e: TimelineEntry): string => e.id),
    ).toEqual(['edu', 'early', 'ended', 'b-same', 'c-same']);
  });
});
