import { readingProgress } from '@internal/content-web-ui/lib/about/components/scroll-words/utils/reading-progress/reading-progress.utils';

describe('readingProgress', (): void => {
  it('reads from 85 % of the screen up', (): void => {
    expect(readingProgress({ top: 900, height: 200 }, 1000)).toBe(0);
    expect(readingProgress({ top: 850 - 275, height: 200 }, 1000)).toBeCloseTo(0.5);
    expect(readingProgress({ top: -500, height: 200 }, 1000)).toBe(1);
  });
});
