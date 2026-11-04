import type { PeriodBound } from '@internal/ui/lib/month-calendar/models/period-bound/period-bound.interface';
import {
  boundKey,
  clampBound,
  compareBounds,
  currentBound,
  isOutOfBounds,
  pageStart,
  sameBound,
  shiftBound,
  toUnit,
} from '@internal/ui/lib/month-calendar/utils/month-calendar/month-calendar.utils';

describe('month-calendar utils', (): void => {
  it('orders bounds by year, then month, a whole year matching each of its months', (): void => {
    expect(compareBounds({ year: 2023, month: 3 }, { year: 2023, month: 4 })).toBeLessThan(0);
    expect(compareBounds({ year: 2024, month: 1 }, { year: 2023, month: 12 })).toBeGreaterThan(0);
    expect(compareBounds({ year: 2023, month: null }, { year: 2023, month: 7 })).toBe(0);
    expect(sameBound({ year: 2023, month: null }, { year: 2023, month: 7 })).toBe(false);
    expect(sameBound({ year: 2023, month: 7 }, { year: 2023, month: 7 })).toBe(true);
    expect(sameBound(null, { year: 2023, month: 7 })).toBe(false);
  });

  it('moves by months across years, or by years', (): void => {
    expect(shiftBound({ year: 2025, month: 12 }, 'month', 1)).toEqual({ year: 2026, month: 1 });
    expect(shiftBound({ year: 2026, month: 2 }, 'month', -14)).toEqual({ year: 2024, month: 12 });
    expect(shiftBound({ year: 2026, month: null }, 'year', -12)).toEqual({
      year: 2014,
      month: null,
    });
  });

  it('starts a page on January or on a block of twelve years', (): void => {
    expect(pageStart({ year: 2026, month: 8 }, 'month')).toEqual({ year: 2026, month: 1 });
    expect(pageStart({ year: 2026, month: null }, 'year')).toEqual({ year: 2016, month: null });
    expect(pageStart({ year: 2028, month: null }, 'year')).toEqual({ year: 2028, month: null });
  });

  it('converts, clamps and keys bounds', (): void => {
    expect(toUnit({ year: 2026, month: null }, 'month')).toEqual({ year: 2026, month: 1 });
    expect(toUnit({ year: 2026, month: 5 }, 'year')).toEqual({ year: 2026, month: null });
    const min: PeriodBound = { year: 2020, month: 6 };
    const max: PeriodBound = { year: 2026, month: 2 };
    expect(clampBound({ year: 2019, month: 1 }, 'month', min, max)).toEqual(min);
    expect(clampBound({ year: 2030, month: null }, 'year', min, max)).toEqual({
      year: 2026,
      month: null,
    });
    expect(isOutOfBounds({ year: 2026, month: 3 }, min, max)).toBe(true);
    expect(isOutOfBounds({ year: 2026, month: null }, min, max)).toBe(false);
    expect(boundKey({ year: 2026, month: 3 })).toBe('2026-03');
    expect(boundKey({ year: 2026, month: null })).toBe('2026');
    expect(currentBound('month', new Date(2026, 10, 4))).toEqual({ year: 2026, month: 11 });
    expect(currentBound('year', new Date(2026, 10, 4))).toEqual({ year: 2026, month: null });
  });
});
