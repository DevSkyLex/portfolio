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

  it('prefixes the French build and preserves the query and fragment', () => {
    expect(localeUrl('/admin/messages?status=archived#top', 'fr')).toBe(
      '/fr/admin/messages?status=archived#top',
    );
    expect(localeUrl('/admin', 'fr')).toBe('/fr/admin');
  });
});
