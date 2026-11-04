import { DomainError } from '@internal/content-domain/lib/errors/domain-error';
import {
  SEO_RANGES,
  isSeoRange,
  reportWindow,
  spanDays,
} from '@internal/content-domain/lib/values/seo-range/seo-range';

describe('reportWindow', (): void => {
  it('ends the report lag days before today, with the period just before it', (): void => {
    // Late evening UTC: the UTC day counts, whatever the hour.
    expect(reportWindow('7d', new Date('2026-11-04T23:59:00Z'), 3)).toEqual({
      range: '7d',
      current: { start: '2026-10-26', end: '2026-11-01' },
      previous: { start: '2026-10-19', end: '2026-10-25' },
    });
  });

  it('spans 28 and 90 days across month and year boundaries', (): void => {
    expect(reportWindow('28d', new Date('2026-03-02T08:00:00Z'), 1)).toEqual({
      range: '28d',
      current: { start: '2026-02-02', end: '2026-03-01' },
      previous: { start: '2026-01-05', end: '2026-02-01' },
    });
    const window: ReturnType<typeof reportWindow> = reportWindow(
      '90d',
      new Date('2026-01-10T00:00:00Z'),
      0,
    );
    expect(window.current).toEqual({ start: '2025-10-13', end: '2026-01-10' });
    expect(spanDays(window.current)).toHaveLength(90);
    expect(spanDays(window.previous)).toHaveLength(90);
    expect(window.previous.end).toBe('2025-10-12');
  });

  it('refuses a negative or fractional lag', (): void => {
    expect((): unknown => reportWindow('7d', new Date(), -1)).toThrow(DomainError);
    expect((): unknown => reportWindow('7d', new Date(), 1.5)).toThrow('lagDays');
  });
});

describe('spanDays', (): void => {
  it('lists every day of a span, none when it is reversed', (): void => {
    expect(spanDays({ start: '2026-02-27', end: '2026-03-02' })).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
    expect(spanDays({ start: '2026-03-02', end: '2026-03-01' })).toEqual([]);
  });
});

describe('isSeoRange', (): void => {
  it('accepts the three report lengths only', (): void => {
    expect(SEO_RANGES.every((range: string): boolean => isSeoRange(range))).toBe(true);
    expect(isSeoRange('30d')).toBe(false);
    expect(isSeoRange(7)).toBe(false);
  });
});
