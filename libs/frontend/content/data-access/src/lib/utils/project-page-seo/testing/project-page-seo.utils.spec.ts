import type { ProjectArticle } from '@vfortin/content-web-model';
import type { PageSeo } from '@internal/content-web-data-access/lib/models/page-seo/page-seo.interface';
import { projectPageSeo } from '@internal/content-web-data-access/lib/utils/project-page-seo/project-page-seo.utils';

/**
 * Constant ORIGIN
 *
 * @description
 * Production origin used by the assertions.
 */
const ORIGIN: string = 'https://valentin-fortin.pro';

/**
 * Function article
 *
 * @description
 * Builds a case study with optional overrides.
 */
const article = (overrides: Partial<ProjectArticle> = {}): ProjectArticle => ({
  slug: 'movah',
  title: 'Movah',
  summary: 'Une application mobile pour suivre ses séries.',
  periodLabel: '2026',
  techs: ['flutter'],
  featured: true,
  cover: null,
  lead: 'Flutter et Supabase.',
  client: 'Projet personnel',
  role: 'Développement',
  place: 'Android et iOS',
  site: null,
  intro: [],
  sections: [],
  seo: { title: null, description: null, keywords: [] },
  ...overrides,
});

describe('projectPageSeo', (): void => {
  it('falls back on the project title and summary without search texts', (): void => {
    const seo: PageSeo = projectPageSeo(article(), 'fr', ORIGIN);
    expect(seo.title).toBe('Movah — Valentin Fortin');
    expect(seo.description).toBe('Une application mobile pour suivre ses séries.');
    expect(seo.type).toBe('article');
    expect(seo.image).toBeNull();
    expect(seo.structuredData).not.toHaveProperty('image');
  });

  it('uses the custom search texts verbatim', (): void => {
    const seo: PageSeo = projectPageSeo(
      article({
        seo: {
          title: 'Movah, suivi de séries',
          description: 'Description choisie.',
          keywords: ['suivi de séries', 'Flutter'],
        },
      }),
      'fr',
      ORIGIN,
    );
    expect(seo.title).toBe('Movah, suivi de séries');
    expect(seo.description).toBe('Description choisie.');
    expect(seo.keywords).toEqual(['suivi de séries', 'Flutter']);
    expect(seo.structuredData).toMatchObject({
      headline: 'Movah',
      description: 'Description choisie.',
      keywords: 'suivi de séries, Flutter',
    });
  });

  it('falls back on the technology keys without keywords, and writes none without either', (): void => {
    const fallback: PageSeo = projectPageSeo(
      article({ techs: ['flutter', 'supabase'] }),
      'fr',
      ORIGIN,
    );
    expect(fallback.keywords).toEqual(['flutter', 'supabase']);
    expect(fallback.structuredData).toMatchObject({ keywords: 'flutter, supabase' });
    const none: PageSeo = projectPageSeo(article({ techs: [] }), 'fr', ORIGIN);
    expect(none.keywords).toEqual([]);
    expect(none.structuredData).not.toHaveProperty('keywords');
  });

  it('cuts a long summary near 160 characters', (): void => {
    const seo: PageSeo = projectPageSeo(article({ summary: 'mot '.repeat(60) }), 'fr', ORIGIN);
    expect(seo.description.length).toBeLessThanOrEqual(160);
    expect(seo.description.endsWith('…')).toBe(true);
  });

  it('builds the French canonical, alternates and Open Graph locales', (): void => {
    const seo: PageSeo = projectPageSeo(article(), 'fr', ORIGIN);
    expect(seo.canonical).toBe('https://valentin-fortin.pro/fr/projects/movah');
    expect(seo.alternates).toEqual([
      { hreflang: 'fr', href: 'https://valentin-fortin.pro/fr/projects/movah' },
      { hreflang: 'en', href: 'https://valentin-fortin.pro/en/projects/movah' },
      { hreflang: 'x-default', href: 'https://valentin-fortin.pro/fr/projects/movah' },
    ]);
    expect([seo.locale, seo.alternateLocale]).toEqual(['fr_FR', 'en_GB']);
  });

  it('builds the English page with an absolute cover and a CreativeWork', (): void => {
    const seo: PageSeo = projectPageSeo(
      article({
        title: 'Movah',
        cover: {
          src: '/media/8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f.webp',
          small: null,
          width: 2400,
          height: 1350,
          alt: 'Movah home screen',
        },
      }),
      'en',
      ORIGIN,
    );
    expect(seo.canonical).toBe('https://valentin-fortin.pro/en/projects/movah');
    expect([seo.locale, seo.alternateLocale]).toEqual(['en_GB', 'fr_FR']);
    expect(seo.image).toEqual({
      url: 'https://valentin-fortin.pro/media/8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f.webp',
      width: 2400,
      height: 1350,
      alt: 'Movah home screen',
    });
    expect(seo.structuredData).toEqual({
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      headline: 'Movah',
      description: 'Une application mobile pour suivre ses séries.',
      url: 'https://valentin-fortin.pro/en/projects/movah',
      inLanguage: 'en',
      keywords: 'flutter',
      image: 'https://valentin-fortin.pro/media/8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f.webp',
      author: {
        '@type': 'Person',
        name: 'Valentin Fortin',
        url: 'https://valentin-fortin.pro/en/',
      },
    });
  });
});
