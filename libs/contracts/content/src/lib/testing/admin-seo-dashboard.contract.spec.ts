import {
  type SeoDashboardDto,
  SeoDashboardDtoSchema,
  SeoDashboardQuerySchema,
  SeoRefreshAcceptedDtoSchema,
} from '@internal/content-contracts/lib/admin-seo-dashboard.contract';
import dashboard from '@internal/content-contracts/lib/testing/admin-seo-dashboard.fixture.json';

describe('SeoDashboardDtoSchema', (): void => {
  it('accepts the fixture shared by the service and the admin page', (): void => {
    const parsed: SeoDashboardDto = SeoDashboardDtoSchema.parse(dashboard);
    expect(parsed.searchConsole.status).toBe('ok');
    expect(parsed.analytics.status).toBe('error');
    expect(parsed.audit.projects[0]?.issues).toHaveLength(5);
  });

  it('accepts the unconfigured and pending sections', (): void => {
    expect(
      SeoDashboardDtoSchema.safeParse({
        ...dashboard,
        searchConsole: {
          status: 'not-configured',
          fetchedAt: null,
          missing: ['SEO_GOOGLE_CREDENTIALS_PATH', 'SEO_SEARCH_CONSOLE_PROPERTY'],
        },
        analytics: { status: 'pending', fetchedAt: null },
      }).success,
    ).toBe(true);
  });

  it('refuses a ratio above 1, an unknown failure code and a day in another format', (): void => {
    const search: (typeof dashboard)['searchConsole'] = dashboard.searchConsole;
    expect(
      SeoDashboardDtoSchema.safeParse({
        ...dashboard,
        searchConsole: {
          ...search,
          data: { ...search.data, totals: { ...search.data.totals, ctr: 1.2 } },
        },
      }).success,
    ).toBe(false);
    expect(
      SeoDashboardDtoSchema.safeParse({
        ...dashboard,
        analytics: { ...dashboard.analytics, error: { code: 'teapot', message: 'No.' } },
      }).success,
    ).toBe(false);
    expect(
      SeoDashboardDtoSchema.safeParse({
        ...dashboard,
        searchConsole: {
          ...search,
          data: { ...search.data, daily: [{ ...search.data.daily[0], date: '05/10/2026' }] },
        },
      }).success,
    ).toBe(false);
  });
});

describe('SeoDashboardQuerySchema', (): void => {
  it('accepts the three ranges or none', (): void => {
    expect(SeoDashboardQuerySchema.parse({})).toEqual({});
    expect(SeoDashboardQuerySchema.parse({ range: '90d' })).toEqual({ range: '90d' });
    expect(SeoDashboardQuerySchema.safeParse({ range: '30d' }).success).toBe(false);
  });
});

describe('SeoRefreshAcceptedDtoSchema', (): void => {
  it('accepts the start and the next allowed refresh', (): void => {
    expect(
      SeoRefreshAcceptedDtoSchema.safeParse({
        startedAt: '2026-11-04T09:00:00.000Z',
        nextAllowedAt: '2026-11-04T09:10:00.000Z',
      }).success,
    ).toBe(true);
    expect(SeoRefreshAcceptedDtoSchema.safeParse({ startedAt: 'now' }).success).toBe(false);
  });
});
