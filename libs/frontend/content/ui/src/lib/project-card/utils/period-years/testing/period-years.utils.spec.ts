import { periodYears } from '@internal/content-web-ui/lib/project-card/utils/period-years/period-years.utils';

/**
 * Constant periodYears specification
 *
 * @description
 * Covers distinct-year extraction and preservation of labels without year values.
 */
describe('periodYears', (): void => {
  it('keeps only the distinct years of the label', (): void => {
    expect(periodYears('Depuis juillet 2026')).toBe('2026');
    expect(periodYears('Mars — avril 2023')).toBe('2023');
    expect(periodYears('2023 — 2026')).toBe('2023 — 2026');
    expect(periodYears('Since July 2026')).toBe('2026');
  });

  it('returns a label without a year unchanged', (): void => {
    expect(periodYears('En cours')).toBe('En cours');
  });
});
