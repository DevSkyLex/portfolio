import { legacyProjectRedirect } from '@internal/web/server/legacy-project-redirect/legacy-project-redirect';

describe('legacyProjectRedirect', (): void => {
  it('moves project lists to the project category in the same locale', (): void => {
    expect(legacyProjectRedirect('/fr/projects', '/fr/projects', true)).toBe(
      '/fr/articles?category=projects',
    );
    expect(
      legacyProjectRedirect('/en/projects/', '/en/projects/?q=Angular&category=old&tag=web', true),
    ).toBe('/en/articles?q=Angular&category=projects&tag=web');
  });

  it('keeps slugs, queries and article fragments when moving detail URLs', (): void => {
    expect(
      legacyProjectRedirect(
        '/en/projects/library-trails',
        '/en/projects/library-trails?source=profile#architecture',
        true,
      ),
    ).toBe('/en/articles/library-trails?source=profile#architecture');
    expect(legacyProjectRedirect('/fr/projects/caf%C3%A9/', '/fr/projects/caf%C3%A9/', true)).toBe(
      '/fr/articles/caf%C3%A9',
    );
  });

  it('canonicalizes unprefixed production URLs in one hop and keeps the dev root', (): void => {
    expect(legacyProjectRedirect('/projects/movah', '/projects/movah', true)).toBe(
      '/fr/articles/movah',
    );
    expect(legacyProjectRedirect('/projects', '/projects', false)).toBe(
      '/articles?category=projects',
    );
  });

  it('ignores APIs, admin paths, current articles and unrelated routes', (): void => {
    for (const path of [
      '/fr/admin/projects',
      '/api/content/admin/projects',
      '/fr/articles',
      '/en/articles/movah',
      '/projects-extra',
      '/projects/one/extra',
    ]) {
      expect(legacyProjectRedirect(path, path, true)).toBeNull();
    }
  });

  it('constructs a local target even for an absolute or network request target', (): void => {
    expect(legacyProjectRedirect('/projects', 'https://external.test/projects', true)).toBe(
      '/fr/articles?category=projects',
    );
    expect(legacyProjectRedirect('/projects/movah', '//external.test/?x=1', true)).toBe(
      '/fr/articles/movah?x=1',
    );
  });
});
