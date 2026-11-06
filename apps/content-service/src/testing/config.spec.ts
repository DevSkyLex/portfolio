import { ConfigError } from '@vfortin/backend-config';
import {
  type ContentServiceConfig,
  DEVELOPMENT_MEDIA_DIR,
  loadContentServiceConfig,
  mediaDirectory,
  seoDashboardOptions,
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

describe('loadContentServiceConfig', (): void => {
  it('applies the defaults without requiring rebuild credentials', (): void => {
    expect(loadContentServiceConfig(base)).toMatchObject({
      CONTENT_PORT: 3101,
      LOG_LEVEL: 'info',
    });
  });

  it('leaves media serving off and resolves the media directory per environment', (): void => {
    const development: ContentServiceConfig = loadContentServiceConfig({
      ...base,
      CONTENT_MEDIA_DIR: '',
      CONTENT_MEDIA_SERVE: '',
    });
    expect(development.CONTENT_MEDIA_SERVE).toBe(false);
    expect(mediaDirectory(development)).toBe(DEVELOPMENT_MEDIA_DIR);
    const served: ContentServiceConfig = loadContentServiceConfig({
      ...base,
      CONTENT_MEDIA_DIR: '/srv/media',
      CONTENT_MEDIA_SERVE: 'true',
    });
    expect([served.CONTENT_MEDIA_SERVE, mediaDirectory(served)]).toEqual([true, '/srv/media']);
    expect(() => loadContentServiceConfig({ ...base, CONTENT_MEDIA_SERVE: 'perhaps' })).toThrow(
      ConfigError,
    );
  });

  it('requires the media directory of the production service only', (): void => {
    // The migrate and seed commands load the same configuration without CONTENT_MEDIA_DIR.
    const production: ContentServiceConfig = loadContentServiceConfig({
      ...base,
      NODE_ENV: 'production',
    });
    expect(() => mediaDirectory(production)).toThrow(/CONTENT_MEDIA_DIR: required in production/);
    expect(mediaDirectory({ ...production, CONTENT_MEDIA_DIR: '/srv/media' })).toBe('/srv/media');
  });

  it('lists the invalid variables', (): void => {
    expect(() => loadContentServiceConfig({ ...base, AUTH_ISSUER: 'not a url' })).toThrow(
      ConfigError,
    );
  });

  it('leaves every SEO dashboard source unconfigured by default', (): void => {
    expect(
      seoDashboardOptions(loadContentServiceConfig({ ...base, SEO_GA4_PROPERTY_ID: '' })),
    ).toEqual({
      siteOrigin: 'https://valentin-fortin.pro',
      credentialsPath: null,
      searchConsoleProperty: null,
      analyticsPropertyId: null,
      pageSpeedApiKey: null,
      webVitalsUrls: [],
      demoData: false,
    });
  });

  it('reads the SEO dashboard settings', (): void => {
    const config: ContentServiceConfig = loadContentServiceConfig({
      ...base,
      SEO_SITE_ORIGIN: 'https://staging.valentin-fortin.pro/',
      SEO_GOOGLE_CREDENTIALS_PATH: '/run/secrets/seo_google_credentials',
      SEO_SEARCH_CONSOLE_PROPERTY: 'sc-domain:valentin-fortin.pro',
      SEO_GA4_PROPERTY_ID: '123456789',
      SEO_PAGESPEED_API_KEY: 'AIzaSyFakeKeyForTheDashboardTests0000',
      SEO_WEB_VITALS_URLS: ' https://valentin-fortin.pro/ , https://valentin-fortin.pro/en/,',
    });
    expect(seoDashboardOptions(config)).toEqual({
      siteOrigin: 'https://staging.valentin-fortin.pro',
      credentialsPath: '/run/secrets/seo_google_credentials',
      searchConsoleProperty: 'sc-domain:valentin-fortin.pro',
      analyticsPropertyId: '123456789',
      pageSpeedApiKey: 'AIzaSyFakeKeyForTheDashboardTests0000',
      webVitalsUrls: ['https://valentin-fortin.pro/', 'https://valentin-fortin.pro/en/'],
      demoData: false,
    });
    expect(
      seoDashboardOptions(loadContentServiceConfig({ ...base, SEO_DEMO_DATA: 'true' })).demoData,
    ).toBe(true);
    expect(
      loadContentServiceConfig({
        ...base,
        SEO_SEARCH_CONSOLE_PROPERTY: 'https://valentin-fortin.pro/',
      }).SEO_SEARCH_CONSOLE_PROPERTY,
    ).toBe('https://valentin-fortin.pro/');
  });

  it.each([
    ['SEO_SEARCH_CONSOLE_PROPERTY', 'valentin-fortin.pro'],
    ['SEO_GA4_PROPERTY_ID', 'G-ABCDEF1234'],
    ['SEO_WEB_VITALS_URLS', 'http://valentin-fortin.pro/'],
    ['SEO_SITE_ORIGIN', 'https://valentin-fortin.pro/fr'],
  ])('refuses an invalid %s', (name: string, value: string): void => {
    expect(() => loadContentServiceConfig({ ...base, [name]: value })).toThrow(new RegExp(name));
  });
});
