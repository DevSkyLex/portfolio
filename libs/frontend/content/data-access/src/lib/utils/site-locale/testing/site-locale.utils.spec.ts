import { localeOf } from '@internal/content-web-data-access/lib/utils/site-locale/site-locale.utils';

describe('localeOf', (): void => {
  it('reads English from any en locale and French otherwise', (): void => {
    expect(localeOf('en')).toBe('en');
    expect(localeOf('en-GB')).toBe('en');
    expect(localeOf('fr')).toBe('fr');
    expect(localeOf('fr-CA')).toBe('fr');
    expect(localeOf('de')).toBe('fr');
  });
});
