import { legacyLocaleRedirect } from '@internal/web/server/legacy-locale-redirect/legacy-locale-redirect';

describe('legacyLocaleRedirect', (): void => {
  it('canonicalizes known and unknown legacy pages with their queries intact', (): void => {
    expect(legacyLocaleRedirect('/admin/login', '/admin/login?next=%2Fprojects')).toBe(
      '/fr/admin/login?next=%2Fprojects',
    );
    expect(legacyLocaleRedirect('/this-page-does-not-exist', '/this-page-does-not-exist')).toBe(
      '/fr/this-page-does-not-exist',
    );
  });

  it('leaves both locale prefixes, assets and service endpoints alone', (): void => {
    for (const path of [
      '/fr',
      '/fr/projects/known',
      '/en/',
      '/en/privacy',
      '/main.js',
      '/assets/font.woff2',
      '/api/content/snapshot',
      '/media/cover.webp',
      '/health/live',
    ]) {
      expect(legacyLocaleRedirect(path, path)).toBeNull();
    }
  });

  it('never turns an absolute request target into an external redirect', (): void => {
    expect(legacyLocaleRedirect('/unknown', 'https://external.test/unknown')).toBe('/fr/unknown');
  });
});
