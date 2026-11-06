import { localizedUrl } from '@internal/content-web-data-access/lib/utils/localized-url/localized-url.utils';

describe('localizedUrl', (): void => {
  it('serves each locale under its prefix', (): void => {
    expect(localizedUrl('https://valentin-fortin.pro', 'fr', '/projects/library-trails')).toBe(
      'https://valentin-fortin.pro/fr/projects/library-trails',
    );
    expect(localizedUrl('https://valentin-fortin.pro', 'en', '/projects/library-trails')).toBe(
      'https://valentin-fortin.pro/en/projects/library-trails',
    );
  });

  it('keeps the trailing slash of the home pages', (): void => {
    expect(localizedUrl('https://valentin-fortin.pro', 'fr', '/')).toBe(
      'https://valentin-fortin.pro/fr/',
    );
    expect(localizedUrl('https://valentin-fortin.pro', 'en', '/')).toBe(
      'https://valentin-fortin.pro/en/',
    );
  });
});
