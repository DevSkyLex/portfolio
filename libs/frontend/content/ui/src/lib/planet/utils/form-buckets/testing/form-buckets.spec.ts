import type { Mock } from 'vitest';
import { FormBuckets } from '@internal/content-web-ui/lib/planet/utils/form-buckets/form-buckets';
import type { PlanetRamp } from '@internal/content-web-ui/lib/planet/models/planet-ramp/planet-ramp.type';

/**
 * Constant RAMP
 *
 * @description
 * Ramp with an empty level and one square level, so each queued mark is observable as one rectangle.
 */
const RAMP: PlanetRamp = [null, ['square', 0.5]];

describe('FormBuckets', (): void => {
  it('fills each colour group once, with one path per group and the marks of its levels', (): void => {
    const calls: string[] = [];
    const ctx = {
      fillStyle: '',
      getTransform: (): { a: number; e: number; f: number } => ({ a: 1, e: 0, f: 0 }),
      beginPath: (): undefined => void calls.push('begin'),
      fill: (): undefined => void calls.push(`fill ${ctx.fillStyle}`),
      moveTo: (): undefined => undefined,
      arc: (): undefined => undefined,
      rect: (x: number, y: number, w: number, h: number): undefined =>
        void calls.push(`rect ${x},${y},${w},${h}`),
    } satisfies DrawingContextDouble;
    const buckets: FormBuckets = new FormBuckets();
    buckets.push('rgba(1,2,3,1)', 1, 0, 0);
    buckets.push('rgba(4,5,6,1)', 1, 10, 0);
    buckets.push('rgba(1,2,3,1)', 0, 20, 0);
    buckets.push('rgba(1,2,3,1)', 1, 30, 0);

    buckets.draw(ctx as unknown as CanvasRenderingContext2D, RAMP, 10);

    expect(calls).toEqual([
      'begin',
      'rect 3,3,5,5',
      'rect 33,3,5,5',
      'fill rgba(1,2,3,1)',
      'begin',
      'rect 13,3,5,5',
      'fill rgba(4,5,6,1)',
    ]);
  });

  it('draws nothing before a mark is queued', (): void => {
    const fill: Mock<() => void> = vi.fn<() => void>();
    const ctx = {
      getTransform: (): { a: number; e: number; f: number } => ({ a: 2, e: 0, f: 0 }),
      fill,
    } satisfies DrawingContextDouble;
    new FormBuckets().draw(ctx as unknown as CanvasRenderingContext2D, RAMP, 10);
    expect(fill).not.toHaveBeenCalled();
  });
});

/** Canvas members used by the bucket-rendering double. */
interface DrawingContextDouble {
  fillStyle?: string;
  getTransform: () => Pick<DOMMatrix, 'a' | 'e' | 'f'>;
  beginPath?: () => void;
  fill: () => void;
  moveTo?: () => void;
  arc?: () => void;
  rect?: (x: number, y: number, w: number, h: number) => void;
}
