import { projectPublicPath } from '@internal/content-web-feature-admin/lib/utils/project-public-path/project-public-path.utils';

describe('projectPublicPath', (): void => {
  it('links the French build to the French page and the English build to the English one', (): void => {
    expect(projectPublicPath('library-trails', 'fr')).toBe('/fr/articles/library-trails');
    expect(projectPublicPath('library-trails', 'en')).toBe('/en/articles/library-trails');
    expect(projectPublicPath('library-trails', 'en-US')).toBe('/en/articles/library-trails');
  });
});
