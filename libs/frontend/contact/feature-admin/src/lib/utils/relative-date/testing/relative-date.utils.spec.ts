import { relativeDate } from '@internal/contact-web-feature-admin/lib/utils/relative-date/relative-date.utils';

const NOW: number = Date.parse('2026-11-02T12:00:00.000Z');
const ago: (seconds: number) => string = (seconds: number): string =>
  new Date(NOW - seconds * 1000).toISOString();
// Intl separates numbers from units with no-break spaces (U+00A0, U+202F).
const label: (iso: string, locale?: string) => string = (iso: string, locale = 'fr'): string =>
  relativeDate(iso, locale, NOW).replace(/[\u00a0\u202f]/g, ' ');

describe('relativeDate', () => {
  it('says "à l’instant" under a minute', () => {
    expect(relativeDate(ago(30), 'fr', NOW)).toBe('à l’instant');
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

  it('spells the units and the date in the given locale', () => {
    expect(label(ago(5 * 60), 'en')).toBe('5 min. ago');
    expect(label(ago(24 * 3600), 'en')).toBe('yesterday');
    expect(label(ago(3 * 24 * 3600), 'en')).toBe('3 days ago');
    expect(label('2026-10-12T09:00:00.000Z', 'en')).toBe('Oct 12');
    expect(label('2025-10-12T09:00:00.000Z', 'en')).toBe('Oct 12, 2025');
  });
});
