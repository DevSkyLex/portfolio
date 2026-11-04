/**
 * Function chartTicks
 *
 * @description
 * Clean y-axis ticks from zero to a round ceiling at or above `max` (1, 2, 2.5 or 5 times a power of
 * ten per step), so that the plot always starts at its baseline and its gridlines fall on numbers a
 * reader can name. A maximum of zero or less gives the ticks of `[0, 1]`.
 *
 * @param {number} max - Largest plotted value.
 * @param {number} count - Wanted number of steps above zero (at least 1).
 *
 * @returns {readonly number[]} Ascending ticks, the first `0`, the last the plot's ceiling.
 */
export function chartTicks(max: number, count: number = 3): readonly number[] {
  const steps: number = Math.max(1, Math.round(count));
  const top: number = Number.isFinite(max) && max > 0 ? max : 1;
  const raw: number = top / steps;
  const magnitude: number = 10 ** Math.floor(Math.log10(raw));
  const step: number =
    [1, 2, 2.5, 5, 10]
      .map((factor: number): number => factor * magnitude)
      .find((candidate: number): boolean => candidate >= raw) ?? 10 * magnitude;
  const ceiling: number = Math.ceil(top / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let value: number = 0; value <= ceiling + step / 2; value += step) {
    // Rounded to the step's precision, so that 0.1 + 0.2 never prints as 0.30000000000000004.
    ticks.push(Number(value.toPrecision(12)));
  }
  return ticks;
}
