import { DomainError, InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';
import {
  FaqEntry,
  type FaqEntryDraft,
  type FaqEntryProps,
} from '@internal/content-domain/lib/faq/faq-entry';
import { LocalizedText } from '@internal/content-domain/lib/values/localized-text/localized-text';

/**
 * Constant DRAFT
 *
 * @description
 * Complete bilingual question and answer.
 */
const DRAFT: FaqEntryDraft = {
  question: { fr: '  Travailles-tu à distance ?  ', en: 'Do you work remotely?' },
  answer: { fr: 'Oui.\nAussi sur site.', en: 'Yes.\nOn site too.' },
};

/**
 * Function entry
 *
 * @description
 * Creates an entry at the supplied position.
 *
 * @param {string} id - Entry identifier.
 * @param {number} position - Position in the list.
 * @returns {FaqEntry} New entry.
 */
function entry(id: string, position: number): FaqEntry {
  return FaqEntry.create({ id, position }, FaqEntry.revisionOf(DRAFT));
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

describe('FaqEntry', (): void => {
  it('creates a complete entry at version 1 with trimmed texts and kept line breaks', (): void => {
    const created: FaqEntry = entry('remote', 2);
    expect(created.version).toBe(1);
    expect(created.position).toBe(2);
    expect(created.question.toProps()).toEqual({
      fr: 'Travailles-tu à distance ?',
      en: 'Do you work remotely?',
    });
    expect(created.answer.fr).toBe('Oui.\nAussi sur site.');
    expect(created.missingFor(['fr', 'en'])).toEqual([]);
  });

  it('refuses a creation without English texts, listing them', (): void => {
    const error: DomainError = failure(() =>
      FaqEntry.create(
        { id: 'x', position: 0 },
        FaqEntry.revisionOf({ question: { fr: 'Question ?' }, answer: { fr: 'Réponse', en: ' ' } }),
      ),
    );
    expect(error.code).toBe('content.faq-entry-incomplete');
    expect(error.details).toEqual(['question.en', 'answer.en']);
  });

  it.each([
    ['an empty French question', { question: { fr: '  ', en: 'Q' } }, 'question.fr'],
    [
      'a question over 200 characters',
      { question: { fr: 'x'.repeat(201), en: 'Q' } },
      'question.fr',
    ],
    [
      'an English answer over 2000 characters',
      { answer: { fr: 'R', en: 'x'.repeat(2001) } },
      'answer.en',
    ],
  ])('refuses %s under its contract field', (_label, override, field): void => {
    const error: DomainError = failure(() => FaqEntry.revisionOf({ ...DRAFT, ...override }));
    expect(error).toBeInstanceOf(InvalidValueError);
    expect(error.details).toEqual([field]);
  });

  it('accepts the exact bounds', (): void => {
    expect(
      FaqEntry.revisionOf({
        question: { fr: 'x'.repeat(200), en: 'y'.repeat(200) },
        answer: { fr: 'x'.repeat(2000), en: 'y'.repeat(2000) },
      }).answer.en,
    ).toHaveLength(2000);
  });

  it('revises the content and keeps identity, position and version', (): void => {
    const subject: FaqEntry = entry('remote', 1);
    subject.revise(FaqEntry.revisionOf({ ...DRAFT, answer: { fr: 'Non.', en: 'No.' } }));
    const props: FaqEntryProps = subject.snapshot();
    expect(props).toMatchObject({ id: 'remote', position: 1, version: 1 });
    expect(props.answer.toProps()).toEqual({ fr: 'Non.', en: 'No.' });
  });

  it('refuses a revision that removes an English text and leaves the entry unchanged', (): void => {
    const subject: FaqEntry = entry('remote', 0);
    const error: DomainError = failure(() =>
      subject.revise(FaqEntry.revisionOf({ ...DRAFT, answer: { fr: 'Seul' } })),
    );
    expect(error.details).toEqual(['answer.en']);
    expect(subject.answer.en).toBe('Yes.\nOn site too.');
  });

  it('rehydrates a stored row and rejects invalid persisted values', (): void => {
    const stored: FaqEntryProps = { ...entry('a', 0).snapshot(), version: 4 };
    expect(FaqEntry.rehydrate(stored).version).toBe(4);
    expect(failure(() => FaqEntry.rehydrate({ ...stored, position: -1 })).details).toEqual([
      'position',
    ]);
    expect(failure(() => FaqEntry.rehydrate({ ...stored, version: 0 })).details).toEqual([
      'version',
    ]);
    const long: FaqEntryProps = {
      ...stored,
      answer: LocalizedText.of('answer.fr', { fr: 'x'.repeat(2001) }),
    };
    expect(failure(() => FaqEntry.rehydrate(long)).details).toEqual(['answer.fr']);
  });

  it('reorders the list and returns only the moved entries', (): void => {
    const [a, b, c] = [entry('a', 0), entry('b', 1), entry('c', 2)];
    const moved: FaqEntry[] = FaqEntry.reorder([a, b, c], ['a', 'c', 'b']);
    expect(moved.map((e: FaqEntry): string => e.id)).toEqual(['c', 'b']);
    expect([a.position, b.position, c.position]).toEqual([0, 2, 1]);
    expect(c.version).toBe(1);
  });

  it.each([
    ['a missing entry', ['a', 'b']],
    ['a repeated entry', ['a', 'b', 'b']],
    ['an unknown entry', ['a', 'b', 'z']],
  ])('refuses an order with %s', (_label, ids): void => {
    const entries: FaqEntry[] = [entry('a', 0), entry('b', 1), entry('c', 2)];
    const error: DomainError = failure(() => FaqEntry.reorder(entries, ids));
    expect(error.code).toBe('content.faq-order-invalid');
    expect(error.details).toEqual(['ids']);
  });

  it('sorts by position, then by identifier', (): void => {
    expect(
      [entry('c', 1), entry('b', 0), entry('a', 1)]
        .sort(FaqEntry.compare)
        .map((e: FaqEntry): string => e.id),
    ).toEqual(['b', 'a', 'c']);
  });
});
