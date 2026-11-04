import { seoSectionView } from '@internal/content-web-feature-admin/lib/utils/seo-section/seo-section.utils';

describe('seoSectionView', (): void => {
  it('lists the variables of a section to configure', (): void => {
    expect(
      seoSectionView<number>({
        status: 'not-configured',
        fetchedAt: null,
        missing: ['SEO_GA4_PROPERTY_ID'],
      }),
    ).toEqual({
      status: 'not-configured',
      data: null,
      fetchedAt: null,
      error: null,
      attemptedAt: null,
      missing: ['SEO_GA4_PROPERTY_ID'],
    });
  });

  it('keeps the last good report beside a failure', (): void => {
    expect(
      seoSectionView<number>({
        status: 'error',
        fetchedAt: '2026-11-03T05:30:00.000Z',
        attemptedAt: '2026-11-04T05:30:00.000Z',
        error: { code: 'timeout', message: 'Google did not answer within 30 s.' },
        data: 42,
      }),
    ).toMatchObject({
      status: 'error',
      data: 42,
      fetchedAt: '2026-11-03T05:30:00.000Z',
      attemptedAt: '2026-11-04T05:30:00.000Z',
      error: { code: 'timeout' },
      missing: [],
    });
    expect(seoSectionView<number>({ status: 'pending', fetchedAt: null }).data).toBeNull();
    expect(
      seoSectionView<number>({ status: 'ok', fetchedAt: '2026-11-04T05:30:00.000Z', data: 7 }),
    ).toMatchObject({ status: 'ok', data: 7, error: null });
  });
});
