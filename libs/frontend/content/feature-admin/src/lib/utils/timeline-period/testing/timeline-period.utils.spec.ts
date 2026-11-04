import { timelinePeriod } from '@internal/content-web-feature-admin/lib/utils/timeline-period/timeline-period.utils';

describe('timelinePeriod', (): void => {
  it('writes an ongoing period up to « aujourd’hui »', (): void => {
    expect(timelinePeriod({ year: 2022, month: 1 }, null)).toBe('janv. 2022 – aujourd’hui');
  });

  it('writes both months of an ended period', (): void => {
    expect(timelinePeriod({ year: 2021, month: 9 }, { year: 2023, month: 6 })).toBe(
      'sept. 2021 – juin 2023',
    );
    expect(timelinePeriod({ year: 2022, month: 2 }, { year: 2022, month: 12 })).toBe(
      'févr. 2022 – déc. 2022',
    );
  });

  it('writes a single month once', (): void => {
    expect(timelinePeriod({ year: 2022, month: 8 }, { year: 2022, month: 8 })).toBe('août 2022');
  });
});
