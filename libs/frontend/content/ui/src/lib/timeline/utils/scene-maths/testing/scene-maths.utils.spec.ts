import { describe, expect, it } from 'vitest';
import {
  activeStep,
  aurora,
  hex,
  isLive,
  rnd,
  sceneProgress,
  smoothProgress,
  timeSpan,
} from '@internal/content-web-ui/lib/timeline/utils/scene-maths/scene-maths.utils';
import type { Palette } from '@internal/content-web-ui/lib/timeline/models/palette/palette.interface';

/**
 * Constant palette
 *
 * @description
 * Distinct channel values make each aurora stop observable in interpolation assertions.
 */
const palette: Palette = {
  star: [255, 255, 255],
  muted: [128, 128, 128],
  pink: [255, 0, 0],
  violet: [0, 255, 0],
  blue: [0, 0, 255],
  cyan: [0, 255, 255],
  void: [0, 0, 0],
};

describe('Parcours scene maths', (): void => {
  it('follows the scroll from the pin to the release of the section', (): void => {
    // 7 screens of 900px plus 212px above the stage.
    expect(sceneProgress(0, 6512, 900)).toBeCloseTo(0);
    expect(sceneProgress(-212, 6512, 900)).toBeCloseTo(212 / 5612);
    expect(sceneProgress(-5612, 6512, 900)).toBe(1);
    expect(sceneProgress(400, 6512, 900)).toBe(0);
    expect(sceneProgress(-9000, 6512, 900)).toBe(1);
  });

  it('spans the axis from just before the first start to just after the last end', (): void => {
    const [t0, t1] = timeSpan([
      [
        { a: 2021.67, b: 2023.5 },
        { a: 2024.67, b: 2026.5 },
      ],
      [{ a: 2022.33, b: 2022.5 }],
    ]);
    expect(t0).toBeCloseTo(2021.32);
    expect(t1).toBeCloseTo(2026.65);
  });

  it('activates the latest step that contains the instant', (): void => {
    const items: { a: number; b: number }[] = [
      { a: 2022.33, b: 2022.5 },
      { a: 2023.17, b: 2023.33 },
      { a: 2023.67, b: 2026.5 },
    ];
    expect(activeStep(items, 2022.4)).toBe(0);
    expect(activeStep(items, 2023)).toBe(-1);
    expect(activeStep(items, 2025)).toBe(2);
    expect(
      activeStep(
        [
          { a: 2023, b: 2026 },
          { a: 2024, b: 2025 },
        ],
        2024.5,
      ),
    ).toBe(1);
  });

  it('only follows the scroll in a scrolling window with motion allowed', (): void => {
    expect(isLive(false, 900, 12000)).toBe(true);
    expect(isLive(true, 900, 12000)).toBe(false);
    expect(isLive(false, 1700, 12000)).toBe(false);
    expect(isLive(false, 900, 920)).toBe(false);
  });

  it('smooths the progress and restarts after a pause', (): void => {
    expect(smoothProgress(null, 0.5, 0.016)).toBe(0.5);
    expect(smoothProgress(0, 1, 1)).toBe(1);
    expect(smoothProgress(0, 1, 0)).toBe(1);
    expect(smoothProgress(0, 1, 0.2)).toBeCloseTo(1 - Math.exp(-1));
  });

  it('samples the aurora gradient at its stops', (): void => {
    expect(aurora(palette, 0)).toEqual([255, 0, 0]);
    expect(aurora(palette, 0.38)).toEqual([0, 255, 0]);
    expect(aurora(palette, 0.7)).toEqual([0, 0, 255]);
    expect(aurora(palette, 2).map(Math.round)).toEqual([0, 255, 255]);
  });

  it('reads hexadecimal colours and keeps the fallback otherwise', (): void => {
    expect(hex(' #05050b', [1, 1, 1])).toEqual([5, 5, 11]);
    expect(hex('#fff', [1, 1, 1])).toEqual([255, 255, 255]);
    expect(hex('rgb(0 0 0)', [1, 1, 1])).toEqual([1, 1, 1]);
  });

  it('draws the same stars on every visit', (): void => {
    const a: () => number = rnd(911);
    const b: () => number = rnd(911);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);

    // Same sequence as the 32-bit LCG s = s * 1664525 + 1013904223.
    expect(rnd(911)()).toBe(((911 * 1664525 + 1013904223) >>> 0) / 4294967296);
  });
});
