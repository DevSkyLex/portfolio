import { chartTicks } from '@internal/ui/lib/chart/utils/chart-ticks/chart-ticks.utils';

describe('chartTicks', (): void => {
  it.each([
    [0, [0, 0.5, 1]],
    [3, [0, 1, 2, 3]],
    [7, [0, 2.5, 5, 7.5]],
    [184, [0, 100, 200]],
    [1_284, [0, 500, 1_000, 1_500]],
    [0.3, [0, 0.1, 0.2, 0.3]],
  ])(
    'rounds a maximum of %s up to clean steps from zero',
    (max: number, expected: number[]): void => {
      expect(chartTicks(max)).toEqual(expected);
    },
  );

  it('never ends below the maximum', (): void => {
    for (const max of [1, 9, 11, 99, 101, 999, 12_345]) {
      const ticks: readonly number[] = chartTicks(max, 4);
      expect(ticks[0]).toBe(0);
      expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(max);
    }
  });
});
