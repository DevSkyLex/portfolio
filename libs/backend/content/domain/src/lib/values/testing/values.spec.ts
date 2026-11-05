import { DomainError } from '@internal/content-domain/lib/errors/domain-error';
import { LocalizedText } from '@internal/content-domain/lib/values/localized-text/localized-text';
import { Period } from '@internal/content-domain/lib/values/period/period';
import {
  ProjectPeriod,
  type ProjectPeriodProps,
} from '@internal/content-domain/lib/values/project-period/project-period';
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

  it('derives a free slug from a title', (): void => {
    expect(Slug.fromTitle('  Refonte : Café & Crème !', new Set()).value).toBe(
      'refonte-cafe-creme',
    );
    expect(Slug.fromTitle('Movah', new Set(['movah', 'movah-2'])).value).toBe('movah-3');
    expect(Slug.fromTitle('—', new Set()).value).toBe('projet');
    expect(Slug.fromTitle('a'.repeat(120), new Set()).value).toHaveLength(72);
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

describe('ProjectPeriod', (): void => {
  it.each<[string, ProjectPeriodProps]>([
    ['whole years', { start: { year: 2023, month: null }, end: { year: 2026, month: null } }],
    ['months of one year', { start: { year: 2023, month: 3 }, end: { year: 2023, month: 4 } }],
    ['a single month', { start: { year: 2023, month: 3 }, end: { year: 2023, month: 3 } }],
    ['mixed precision', { start: { year: 2023, month: 9 }, end: { year: 2023, month: null } }],
    ['an ongoing month', { start: { year: 2026, month: 7 }, end: null }],
  ])('accepts %s and copies the bounds', (_label, props): void => {
    const period: ProjectPeriod = ProjectPeriod.of(props);
    expect(period.toProps()).toEqual(props);
    expect(period.toProps().start).not.toBe(props.start);
    expect(period.isOngoing()).toBe(props.end === null);
  });

  it.each<[string, ProjectPeriodProps, string]>([
    ['a year before 1990', { start: { year: 1989, month: null }, end: null }, 'period.start'],
    [
      'a year after 2100',
      { start: { year: 2023, month: null }, end: { year: 2101, month: null } },
      'period.end',
    ],
    ['a fractional year', { start: { year: 2023.5, month: null }, end: null }, 'period.start'],
    ['month 0', { start: { year: 2023, month: 0 }, end: null }, 'period.start'],
    ['month 13', { start: { year: 2023, month: 1 }, end: { year: 2023, month: 13 } }, 'period.end'],
    [
      'an earlier end year',
      { start: { year: 2024, month: null }, end: { year: 2023, month: 12 } },
      'period.end',
    ],
    [
      'an earlier end month',
      { start: { year: 2023, month: 4 }, end: { year: 2023, month: 3 } },
      'period.end',
    ],
  ])('rejects %s', (_label, props, field): void => {
    expect((): ProjectPeriod => ProjectPeriod.of(props)).toThrow(DomainError);
    expect((): ProjectPeriod => ProjectPeriod.of(props)).toThrow(field);
  });
});
