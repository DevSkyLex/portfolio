import { DomainError } from '@internal/content-domain/lib/errors/domain-error';
import { LocalizedText } from '@internal/content-domain/lib/values/localized-text/localized-text';
import { Period } from '@internal/content-domain/lib/values/period/period';
import { Slug } from '@internal/content-domain/lib/values/slug/slug';

describe('LocalizedText', (): void => {
  it('requires a non-empty French text', (): void => {
    expect((): LocalizedText => LocalizedText.of('title', { fr: '   ' })).toThrow(DomainError);
  });

  it('falls back to French while English is missing', (): void => {
    const text: LocalizedText = LocalizedText.of('title', { fr: 'Projets', en: ' ' });
    expect(text.in('en')).toBe('Projets');
    expect(text.isCompleteFor('en')).toBe(false);
    expect(text.toProps()).toEqual({ fr: 'Projets' });
  });

  it('returns the translation when it exists', (): void => {
    const text: LocalizedText = LocalizedText.of('title', { fr: 'Projets', en: 'Projects' });
    expect(text.in('en')).toBe('Projects');
    expect(text.in('fr')).toBe('Projets');
    expect(text.isCompleteFor('en')).toBe(true);
    expect(text.isCompleteFor('fr')).toBe(true);
    expect(text.toProps()).toEqual({ fr: 'Projets', en: 'Projects' });
  });
});

describe('Slug', (): void => {
  it.each(['iotplatform', 'rdi-manager', 'crm-2023'])('accepts "%s"', (value): void => {
    expect(Slug.of(value).value).toBe(value);
  });

  it.each(['RDI', 'rdi--manager', '-rdi', 'rdi manager', '', 'a'.repeat(81)])(
    'rejects "%s"',
    (value): void => {
      expect((): Slug => Slug.of(value)).toThrow(DomainError);
    },
  );

  it('compares by value', (): void => {
    expect(Slug.of('movah').equals(Slug.of('movah'))).toBe(true);
    expect(Slug.of('movah').equals(Slug.of('crm'))).toBe(false);
  });
});

describe('Period', (): void => {
  it('rejects an end before the start', (): void => {
    expect((): Period => Period.of({ year: 2024, month: 9 }, { year: 2024, month: 6 })).toThrow(
      DomainError,
    );
  });

  it('rejects an out-of-range month', (): void => {
    expect((): Period => Period.of({ year: 2024, month: 13 }, null)).toThrow(DomainError);
  });

  it('sorts by start then by end, ongoing periods last', (): void => {
    const bts: Period = Period.of({ year: 2021, month: 9 }, { year: 2023, month: 6 });
    const job: Period = Period.of({ year: 2023, month: 9 }, null);
    const bachelor: Period = Period.of({ year: 2023, month: 9 }, { year: 2024, month: 6 });
    const sorted: Period[] = [job, bachelor, bts].sort((a: Period, b: Period): number =>
      a.compareTo(b),
    );
    expect(sorted).toEqual([bts, bachelor, job]);
    expect(job.isOngoing()).toBe(true);
    expect(bts.isOngoing()).toBe(false);
    expect(job.compareTo(Period.of({ year: 2023, month: 9 }, null))).toBe(0);
    expect(job.compareTo(bachelor)).toBe(1);
    expect(bachelor.compareTo(job)).toBe(-1);
    expect(bts.compareTo(Period.of({ year: 2021, month: 9 }, { year: 2024, month: 6 }))).toBe(-12);
  });

  it.each([
    [{ year: 1989, month: 1 }],
    [{ year: 2101, month: 1 }],
    [{ year: 2024.5, month: 1 }],
    [{ year: 2024, month: 0 }],
  ])('rejects the month %o', (start): void => {
    expect((): Period => Period.of(start, null)).toThrow(DomainError);
  });
});
