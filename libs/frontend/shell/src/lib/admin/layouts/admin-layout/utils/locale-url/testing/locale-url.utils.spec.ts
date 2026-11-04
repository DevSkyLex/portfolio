import { localeUrl } from '@internal/web-shell/lib/admin/layouts/admin-layout/utils/locale-url/locale-url.utils';

describe('localeUrl', () => {
  it('prefixes the English build and keeps the query and fragment', () => {
    expect(localeUrl('/admin/projects?statut=publie#top', 'en')).toBe(
      '/en/admin/projects?statut=publie#top',
    );
    expect(localeUrl('/admin/oauth/authorize?client_id=a', 'en')).toBe(
      '/en/admin/oauth/authorize?client_id=a',
    );
  });

  it('serves the French build at the router URL itself', () => {
    expect(localeUrl('/admin/messages', 'fr')).toBe('/admin/messages');
    expect(localeUrl('/admin', 'fr')).toBe('/admin');
  });
});
