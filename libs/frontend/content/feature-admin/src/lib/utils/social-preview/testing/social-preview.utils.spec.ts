import { type ProjectPageSeoSource, projectPageSeo } from '@vfortin/content-web-data-access/admin';
import { socialPreview } from '@internal/content-web-feature-admin/lib/utils/social-preview/social-preview.utils';

/**
 * Constant SOURCE
 *
 * @description
 * English case study with a cover and a custom search title.
 */
const SOURCE: ProjectPageSeoSource = {
  slug: 'movah',
  title: 'Movah',
  summary: 'A mobile app.',
  techs: [],
  cover: { src: '/media/cover.webp', small: null, width: 1200, height: 630, alt: 'Home' },
  seo: { title: 'Movah in short', description: null, keywords: [] },
};

describe('socialPreview', (): void => {
  it('shows the Open Graph texts, the domain and the cover', (): void => {
    const origin: string = 'https://valentin-fortin.pro';
    expect(socialPreview(projectPageSeo(SOURCE, 'en', origin), SOURCE, origin)).toEqual({
      domain: 'valentin-fortin.pro',
      title: 'Movah in short',
      description: 'A mobile app.',
      image: { src: '/media/cover.webp', alt: 'Home' },
    });
  });

  it('has no image without cover', (): void => {
    const source: ProjectPageSeoSource = { ...SOURCE, cover: null };
    const origin: string = 'https://example.test';
    expect(socialPreview(projectPageSeo(source, 'fr', origin), source, origin)).toMatchObject({
      domain: 'example.test',
      image: null,
    });
  });
});
