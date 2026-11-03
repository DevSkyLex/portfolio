import { relativeDate } from '@internal/contact-web-feature-admin/lib/utils/relative-date/relative-date.utils';

const NOW: number = Date.parse('2026-11-02T12:00:00.000Z');
const ago: (seconds: number) => string = (seconds: number): string =>
  new Date(NOW - seconds * 1000).toISOString();
// Intl separates numbers from units with no-break spaces (U+00A0, U+202F).
const label: (iso: string) => string = (iso: string): string =>
  relativeDate(iso, NOW).replace(/[\u00a0\u202f]/g, ' ');

describe('relativeDate', () => {
  it('says "à l’instant" under a minute', () => {
    expect(relativeDate(ago(30), NOW)).toBe('à l’instant');
  });

  it('counts minutes, hours and days, with "hier" for yesterday', () => {
    expect(label(ago(5 * 60))).toBe('il y a 5 min');
    expect(label(ago(3 * 3600))).toBe('il y a 3 h');
    expect(label(ago(24 * 3600))).toBe('hier');
    expect(label(ago(3 * 24 * 3600))).toBe('il y a 3 j');
  });

  it('writes the date out after a week, with the year only when it differs', () => {
    expect(label('2026-10-12T09:00:00.000Z')).toBe('12 oct.');
    expect(label('2025-10-12T09:00:00.000Z')).toBe('12 oct. 2025');
  });
});
