import type { PageSeo } from '@internal/content-web-data-access/lib/models/page-seo/page-seo.interface';
import { pageSeo } from '@internal/content-web-data-access/lib/utils/page-seo/page-seo.utils';

describe('pageSeo', (): void => {
  it('points the English home page to /en/ and x-default to the French one', (): void => {
    const seo: PageSeo = pageSeo(
      {
        title: 'Valentin Fortin — Fullstack web developer',
        description: 'Projects, journey and skills.',
        path: '/',
        type: 'website',
        image: null,
        structuredData: null,
      },
      'en',
      'https://valentin-fortin.pro',
    );
    expect(seo).toEqual({
      title: 'Valentin Fortin — Fullstack web developer',
      description: 'Projects, journey and skills.',
      keywords: [],
      canonical: 'https://valentin-fortin.pro/en/',
      alternates: [
        { hreflang: 'fr', href: 'https://valentin-fortin.pro/' },
        { hreflang: 'en', href: 'https://valentin-fortin.pro/en/' },
        { hreflang: 'x-default', href: 'https://valentin-fortin.pro/' },
      ],
      type: 'website',
      locale: 'en_GB',
      alternateLocale: 'fr_FR',
      image: null,
      structuredData: null,
    });
  });
});
