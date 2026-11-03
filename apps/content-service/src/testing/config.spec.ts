import { ConfigError } from '@vfortin/backend-config';
import {
  type ContentServiceConfig,
  loadContentServiceConfig,
} from '@internal/content-service/config';

/**
 * Constant base
 *
 * @description
 * Supplies the minimal valid database and identity settings shared by content configuration cases.
 */
const base: Readonly<Record<string, string>> = {
  CONTENT_DATABASE_URL: 'pglite:memory',
  AUTH_ISSUER: 'https://exemple.fr/api/auth',
  AUTH_JWKS_URL: 'http://identity:3103/api/auth/jwks.json',
};

/**
 * Constant token
 *
 * @description
 * Provides a sufficiently long fixture value for the optional site-build credential schema.
 */
const token: string = 'github_pat_0123456789abcdef';

describe('loadContentServiceConfig', (): void => {
  it('applies the defaults and leaves the site rebuild off', (): void => {
    expect(loadContentServiceConfig(base)).toMatchObject({
      CONTENT_PORT: 3101,
      SITE_BUILD_WORKFLOW: 'site-build.yml',
      SITE_BUILD_REF: 'main',
      LOG_LEVEL: 'info',
    });
    const blank: ContentServiceConfig = loadContentServiceConfig({
      ...base,
      SITE_BUILD_REPOSITORY: '',
      SITE_BUILD_TOKEN: '',
    });
    expect([blank.SITE_BUILD_REPOSITORY, blank.SITE_BUILD_TOKEN]).toEqual([undefined, undefined]);
  });

  it('enables the rebuild with a repository and its token', (): void => {
    const config: ContentServiceConfig = loadContentServiceConfig({
      ...base,
      SITE_BUILD_REPOSITORY: 'devskylex/portfolio',
      SITE_BUILD_TOKEN: token,
    });
    expect(config).toMatchObject({
      SITE_BUILD_REPOSITORY: 'devskylex/portfolio',
      SITE_BUILD_TOKEN: token,
    });
  });

  it('refuses a repository without its token', (): void => {
    expect(() =>
      loadContentServiceConfig({ ...base, SITE_BUILD_REPOSITORY: 'devskylex/portfolio' }),
    ).toThrow(/SITE_BUILD_TOKEN: required when SITE_BUILD_REPOSITORY is set/);
  });

  it('lists the invalid variables', (): void => {
    expect(() => loadContentServiceConfig({ ...base, AUTH_ISSUER: 'not a url' })).toThrow(
      ConfigError,
    );
  });
});
