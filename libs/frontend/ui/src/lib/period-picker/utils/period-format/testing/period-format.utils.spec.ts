import type { Period } from '@internal/ui/lib/period-picker/models/period/period.interface';
import { formatPeriod } from '@internal/ui/lib/period-picker/utils/period-format/period-format.utils';

/**
 * Function label
 *
 * @description
 * French and English labels of a period, spaces normalized (ICU may use thin spaces around dashes).
 *
 * @param {Period} period - Period.
 *
 * @returns {[string, string]} French and English labels.
 */
const label = (period: Period): [string, string] =>
  (['fr', 'en'] as const).map((locale) =>
    formatPeriod(period, locale, (start: string): string =>
      locale === 'fr' ? `Depuis ${start}` : `Since ${start}`,
    ).replace(/\s+/g, ' '),
  ) as [string, string];

describe('formatPeriod', (): void => {
  it('shares what both ends of a month period have in common', (): void => {
    expect(label({ start: { year: 2023, month: 3 }, end: { year: 2023, month: 4 } })).toEqual([
      'mars – avril 2023',
      'March – April 2023',
    ]);
    expect(label({ start: { year: 2023, month: 9 }, end: { year: 2026, month: 6 } })).toEqual([
      'septembre 2023 – juin 2026',
      'September 2023 – June 2026',
    ]);
    expect(label({ start: { year: 2023, month: 3 }, end: { year: 2023, month: 3 } })).toEqual([
      'mars 2023',
      'March 2023',
    ]);
  });

  it('writes years only when an end has no month, and an ongoing period through since', (): void => {
    expect(
      label({ start: { year: 2023, month: null }, end: { year: 2026, month: null } }).map((text) =>
        text.replace(/ ?– ?/, '–'),
      ),
    ).toEqual(['2023–2026', '2023–2026']);
    expect(label({ start: { year: 2026, month: 7 }, end: null })).toEqual([
      'Depuis juillet 2026',
      'Since July 2026',
    ]);
    expect(label({ start: { year: 2023, month: null }, end: null })).toEqual([
      'Depuis 2023',
      'Since 2023',
    ]);
  });
});
