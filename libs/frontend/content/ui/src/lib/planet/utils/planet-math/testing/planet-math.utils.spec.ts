import type { PlanetGeometry } from '@internal/content-web-ui/lib/planet/models/planet-geometry/planet-geometry.interface';
import type { AuroraStops } from '@internal/content-web-ui/lib/planet/models/aurora-stops/aurora-stops.type';
import { PLANET_FORMS } from '@internal/content-web-ui/lib/planet/models/planet-forms/planet-forms.model';
import {
  addForm,
  auroraAt,
  colorKey,
  fbm,
  formLevel,
  formsOf,
  hash2,
  parseColor,
  planetGeometry,
} from '@internal/content-web-ui/lib/planet/utils/planet-math/planet-math.utils';

/**
 * Constant STOPS
 *
 * @description
 * Primary-colour stops expose each interpolation boundary in the gradient assertions.
 */
const STOPS: AuroraStops = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 255, 255],
];

describe('planet math', (): void => {
  it('maps luminance to a ramp level, 0 being empty', (): void => {
    const ramp: typeof PLANET_FORMS.squares = PLANET_FORMS.squares;
    expect(formLevel(0, ramp)).toBe(0);
    expect(formLevel(Number.NaN, ramp)).toBe(0);
    expect(formLevel(0.01, ramp)).toBe(1);
    expect(formLevel(0.5, ramp)).toBe(5);
    expect(formLevel(1, ramp)).toBe(8);
    expect(formsOf('unknown')).toBe(PLANET_FORMS.mixed);
  });

  it('parses hex and rgb() colours', (): void => {
    expect(parseColor('#05050b')).toEqual([5, 5, 11]);
    expect(parseColor(' #fff ')).toEqual([255, 255, 255]);
    expect(parseColor('rgb(79, 230, 255)')).toEqual([79, 230, 255]);
    expect(parseColor('rgba(1 2 3 / 0.5)')).toEqual([1, 2, 3]);
    expect(parseColor('oklch(0.5 0.1 200)')).toBeNull();
    expect(parseColor('')).toBeNull();
  });

  it('interpolates the aurora stops at 0, 0.38, 0.7 and 1', (): void => {
    expect(auroraAt(STOPS, -1)).toEqual([255, 0, 0]);
    expect(auroraAt(STOPS, 0.19)).toEqual([127.5, 127.5, 0]);
    expect(auroraAt(STOPS, 0.7)).toEqual([0, 0, 255]);
    expect(auroraAt(STOPS, 2)).toEqual([255, 255, 255]);
  });

  it('quantises opacity to eighths', (): void => {
    expect(colorKey([1.4, 2.6, 3], 0.3)).toBe('rgba(1,3,3,0.25)');
    expect(colorKey([0, 0, 0], 0)).toBe('rgba(0,0,0,0.125)');
  });

  it('places the planet off frame, bottom right, sinking with the scroll', (): void => {
    expect(planetGeometry(1440, 900, 'right', 0, 0.65, 0.16)).toEqual({
      R: 1440 * 1.1 * 0.65,
      x: 1440 + 1440 * 1.1 * 0.65 * 0.38,
      y: 900 + 1440 * 1.1 * 0.65 * (0.42 - 0.16),
    });
    const left: PlanetGeometry = planetGeometry(400, 800, 'left', 1, 0, 0);
    expect(left.R).toBeCloseTo(880);
    expect(left.x).toBeCloseTo(-880 * 0.38);
    expect(left.y).toBeCloseTo(800 + 880 * 0.64);
  });

  it('hashes and noises deterministically in [0, 1)', (): void => {
    expect(hash2(3, 7)).toBe(hash2(3, 7));
    for (let i: number = 0; i < 50; i++) {
      const h: number = hash2(i * 13, i * 7 - 20);
      const n: number = fbm(i * 0.37, i * 0.21);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(1);
    }
  });

  it('snaps square forms to the pixel grid and keeps strokes at least one pixel', (): void => {
    const rects: number[][] = [];
    const ctx: {
      moveTo: () => undefined;
      arc: () => undefined;
      rect: (...r: number[]) => undefined;
    } = {
      moveTo: (): undefined => undefined,
      arc: (): undefined => undefined,
      rect: (...r: number[]): undefined => void rects.push(r),
    };
    addForm(ctx, ['square', 0.14], 0, 0, 10, { k: 1.5, x: 0, y: 0 });
    addForm(ctx, ['plus', 0.12, 0.05], 10, 0, 10, { k: 1, x: 0, y: 0 });
    expect(rects[0]).toEqual([
      4.666666666666667, 4.666666666666667, 1.3333333333333333, 1.3333333333333333,
    ]);
    expect(rects.slice(1)).toEqual([
      [14, 5, 3, 1],
      [15, 4, 1, 3],
    ]);
  });
});
