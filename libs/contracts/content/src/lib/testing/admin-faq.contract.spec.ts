import {
  AdminFaqEntryDtoSchema,
  AdminFaqListSchema,
  FAQ_ENTRY_LIMITS,
  type FaqEntryRequest,
  FaqEntryRequestSchema,
  FaqOrderRequestSchema,
} from '@internal/content-contracts/lib/admin-faq.contract';
import list from '@internal/content-contracts/lib/testing/admin-faq.fixture.json';

/**
 * Constant entry
 *
 * @description
 * First entry of the fixture list.
 */
const entry: (typeof list.member)[number] = list.member[0] as (typeof list.member)[number];

describe('AdminFaqListSchema', (): void => {
  it('accepts the fixture shared by the service and the admin screen', (): void => {
    expect(AdminFaqListSchema.parse(list).member.map((e): string => e.id)).toEqual([
      'availability',
      'contact',
    ]);
    expect(AdminFaqEntryDtoSchema.parse(entry).answer.fr).toBe('[À COMPLÉTER]');
  });

  it('rejects a version below 1 and a negative position', (): void => {
    expect(AdminFaqListSchema.safeParse({ ...list, version: 0 }).success).toBe(false);
    expect(AdminFaqEntryDtoSchema.safeParse({ ...entry, position: -1 }).success).toBe(false);
  });
});

describe('FaqEntryRequestSchema', (): void => {
  it('accepts the editable fields of the fixture, trims the texts and allows an English gap', (): void => {
    const parsed: FaqEntryRequest = FaqEntryRequestSchema.parse({
      question: { fr: '  Travailles-tu à distance ?  ' },
      answer: entry.answer,
    });
    expect(parsed.question).toEqual({ fr: 'Travailles-tu à distance ?' });
  });

  it('accepts the exact bounds', (): void => {
    expect(
      FaqEntryRequestSchema.safeParse({
        question: { fr: 'x'.repeat(FAQ_ENTRY_LIMITS.question), en: 'y'.repeat(200) },
        answer: { fr: 'x'.repeat(FAQ_ENTRY_LIMITS.answer), en: 'y'.repeat(2000) },
      }).success,
    ).toBe(true);
  });

  it.each([
    ['an empty French question', { question: { fr: '   ' } }, 'question.fr'],
    ['a question over 200 characters', { question: { fr: 'x'.repeat(201) } }, 'question.fr'],
    [
      'an English answer over 2000 characters',
      { answer: { fr: 'R', en: 'x'.repeat(2001) } },
      'answer.en',
    ],
    ['a missing answer', { answer: undefined }, 'answer'],
  ])('rejects %s at its path', (_label, override, path): void => {
    const result: ReturnType<typeof FaqEntryRequestSchema.safeParse> =
      FaqEntryRequestSchema.safeParse({
        question: entry.question,
        answer: entry.answer,
        ...override,
      });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue): string => issue.path.join('.'))).toContain(path);
  });
});

describe('FaqOrderRequestSchema', (): void => {
  it('accepts distinct identifiers and rejects a repeated, empty or oversized list', (): void => {
    expect(FaqOrderRequestSchema.parse({ ids: ['a', 'b'] }).ids).toEqual(['a', 'b']);
    expect(FaqOrderRequestSchema.safeParse({ ids: ['a', 'a'] }).success).toBe(false);
    expect(FaqOrderRequestSchema.safeParse({ ids: [''] }).success).toBe(false);
    expect(
      FaqOrderRequestSchema.safeParse({
        ids: Array.from({ length: 101 }, (_, i): string => `e${i}`),
      }).success,
    ).toBe(false);
  });
});
