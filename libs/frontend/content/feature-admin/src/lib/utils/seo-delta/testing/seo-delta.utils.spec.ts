import type { SeoFormatter } from '@internal/content-web-feature-admin/lib/models/seo-formatter/seo-formatter.interface';
import {
  positionDelta,
  relativeDelta,
} from '@internal/content-web-feature-admin/lib/utils/seo-delta/seo-delta.utils';
import { seoFormatter } from '@internal/content-web-feature-admin/lib/utils/seo-format/seo-format.utils';

describe('relativeDelta', (): void => {
  const format: SeoFormatter = seoFormatter('en');

  it('compares with the period before, more being good by default', (): void => {
    expect(relativeDelta(120, 100, format)).toEqual({
      display: '+20%',
      direction: 'up',
      tone: 'good',
    });
    expect(relativeDelta(80, 100, format)).toEqual({
      display: '-20%',
      direction: 'down',
      tone: 'bad',
    });
    expect(relativeDelta(80, 100, format, 'lower')?.tone).toBe('good');
  });

  it('is flat under 0.05 % and absent without a period before', (): void => {
    expect(relativeDelta(10_001, 10_000, format)).toEqual({
      display: '0%',
      direction: 'flat',
      tone: 'flat',
    });
    expect(relativeDelta(12, 0, format)).toBeNull();
  });
});

describe('positionDelta', (): void => {
  const format: SeoFormatter = seoFormatter('en');

  it('counts positions, a lower one being good', (): void => {
    expect(positionDelta(6.2, 8.5, format)).toEqual({
      display: '-2.3',
      direction: 'down',
      tone: 'good',
    });
    expect(positionDelta(9, 8, format)?.tone).toBe('bad');
    expect(positionDelta(8.02, 8, format)?.direction).toBe('flat');
  });

  it('is absent when either period had no impression', (): void => {
    expect(positionDelta(0, 8, format)).toBeNull();
    expect(positionDelta(8, 0, format)).toBeNull();
  });
});
