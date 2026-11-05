import type { HeatmapCell } from '@vfortin/ui';
import {
  type SeoCalendar,
  seoCalendar,
} from '@internal/content-web-feature-admin/lib/utils/seo-calendar/seo-calendar.utils';

describe('seoCalendar', (): void => {
  it('lays the days out by weekday, Monday first, and by week, naming every fourth week', (): void => {
    // Monday 2 and Tuesday 3 November, Thursday 5, then Tuesday 1 December, four weeks on.
    const days: { date: string; sessions: number }[] = [
      { date: '2026-11-03', sessions: 4 },
      { date: '2026-11-02', sessions: 1 },
      { date: '2026-11-05', sessions: 0 },
      { date: '2026-12-01', sessions: 7 },
    ];
    const calendar: SeoCalendar = seoCalendar(
      days,
      (day: { sessions: number }): number => day.sessions,
      (value: number): string => `${value} s`,
      'fr',
    );
    expect(calendar.rows.map((row) => row.label)).toEqual([
      'lun.',
      'mar.',
      'mer.',
      'jeu.',
      'ven.',
      'sam.',
      'dim.',
    ]);
    // Five weeks, the three without any day kept, named on every fourth one.
    expect(calendar.columns).toEqual(['2 nov.', '', '', '', '30 nov.']);
    const cell = (row: number, column: number): HeatmapCell | null | undefined =>
      calendar.rows[row]?.cells[column];
    expect(cell(0, 0)).toEqual({ label: 'lundi 2 novembre', value: 1, display: '1 s' });
    expect(cell(1, 0)?.value).toBe(4);
    expect(cell(2, 0)).toBeNull();
    expect(cell(3, 0)?.display).toBe('0 s');
    expect(cell(1, 2)).toBeNull();
    expect(cell(1, 4)?.label).toBe('mardi 1 décembre');
  });

  it('returns empty rows for a window without days', (): void => {
    const calendar: SeoCalendar = seoCalendar([], (): number => 0, String, 'fr');
    expect(calendar.columns).toEqual([]);
    expect(calendar.rows.every((row) => row.cells.length === 0)).toBe(true);
  });
});
