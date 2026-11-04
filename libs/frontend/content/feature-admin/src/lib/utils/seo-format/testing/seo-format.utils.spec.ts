import type { SeoFormatter } from '@internal/content-web-feature-admin/lib/models/seo-formatter/seo-formatter.interface';
import { seoFormatter } from '@internal/content-web-feature-admin/lib/utils/seo-format/seo-format.utils';

/**
 * Function plain
 *
 * @description
 * Replaces the narrow and regular no-break spaces `Intl` writes in French with plain spaces.
 *
 * @param {string} text - Formatted text.
 *
 * @returns {string} Comparable text.
 */
const plain = (text: string): string => text.replace(/[\u2009\u202f\u00a0]/g, ' ');

describe('seoFormatter', (): void => {
  const fr: SeoFormatter = seoFormatter('fr');
  const en: SeoFormatter = seoFormatter('en');

  it('formats counts, percentages and positions in the build locale', (): void => {
    expect(plain(fr.count(12345))).toBe('12 345');
    expect(en.count(12345)).toBe('12,345');
    expect(plain(fr.percent(0.0423))).toBe('4,2 %');
    expect(en.percent(0.0423)).toBe('4.2%');
    expect(plain(fr.signedPercent(0.12))).toBe('+12 %');
    expect(plain(fr.signedPercent(-0.035))).toBe('-3,5 %');
    expect(fr.decimal(8.26)).toBe('8,3');
    expect(fr.signedDecimal(-1.24)).toBe('-1,2');
    expect(fr.shift(0.052)).toBe('0,05');
  });

  it('writes durations as minutes and seconds', (): void => {
    expect(plain(fr.duration(42.4))).toBe('42 s');
    expect(plain(fr.duration(83))).toBe('1 min 23 s');
    expect(plain(fr.duration(120))).toBe('2 min');
    expect(en.duration(83)).toBe('1 min 23 sec');
    expect(plain(fr.seconds(2430))).toBe('2,4 s');
    expect(plain(fr.milliseconds(180))).toBe('180 ms');
  });

  it('formats calendar days in UTC, whatever the time zone', (): void => {
    expect(fr.day('2026-11-04')).toBe('4 nov.');
    expect(en.day('2026-11-04')).toBe('Nov 4');
    expect(plain(fr.span('2026-10-08', '2026-11-04'))).toBe('8 oct. – 4 nov. 2026');
  });
});
