import { projectPublicPath } from '@internal/content-web-feature-admin/lib/utils/project-public-path/project-public-path.utils';

describe('projectPublicPath', (): void => {
  it('links the French build to the French page and the English build to the English one', (): void => {
    expect(projectPublicPath('movah', 'fr')).toBe('/projects/movah');
    expect(projectPublicPath('movah', 'en')).toBe('/en/projects/movah');
    expect(projectPublicPath('movah', 'en-US')).toBe('/en/projects/movah');
  });
});
