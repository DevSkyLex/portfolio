import { localizedUrl } from '@internal/content-web-data-access/lib/utils/localized-url/localized-url.utils';

describe('localizedUrl', (): void => {
  it('serves French at the root and English under /en', (): void => {
    expect(localizedUrl('https://valentin-fortin.pro', 'fr', '/projects/movah')).toBe(
      'https://valentin-fortin.pro/projects/movah',
    );
    expect(localizedUrl('https://valentin-fortin.pro', 'en', '/projects/movah')).toBe(
      'https://valentin-fortin.pro/en/projects/movah',
    );
  });

  it('keeps the trailing slash of the home pages', (): void => {
    expect(localizedUrl('https://valentin-fortin.pro', 'fr', '/')).toBe(
      'https://valentin-fortin.pro/',
    );
    expect(localizedUrl('https://valentin-fortin.pro', 'en', '/')).toBe(
      'https://valentin-fortin.pro/en/',
    );
  });
});
