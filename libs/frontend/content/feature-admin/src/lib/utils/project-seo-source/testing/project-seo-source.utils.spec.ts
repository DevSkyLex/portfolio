import type { AdminMedia } from '@vfortin/content-web-data-access/admin';
import { EMPTY_PROJECT_DRAFT } from '@internal/content-web-feature-admin/lib/constants/empty-project-draft.constants';
import type { ProjectFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/project-form-values.model';
import { projectSeoSource } from '@internal/content-web-feature-admin/lib/utils/project-seo-source/project-seo-source.utils';

/**
 * Constant MEDIA
 *
 * @description
 * Cover media known to the page.
 */
const MEDIA: AdminMedia = {
  id: '8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f',
  src: '/media/8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f.webp',
  width: 2400,
  height: 1350,
};

/**
 * Constant VALUES
 *
 * @description
 * Form values with texts to trim, a cover and French keywords.
 */
const VALUES: ProjectFormValues = {
  ...EMPTY_PROJECT_DRAFT,
  title: { fr: ' Library Trails ', en: 'Library Trails EN' },
  summary: { fr: ' Covoiturage local. ', en: 'Local carpooling.' },
  techs: ['flutter'],
  cover: { media: MEDIA.id, alt: { fr: ' Accueil ', en: '' } },
  seo: {
    title: { fr: '  ', en: ' Library Trails in short ' },
    description: { fr: ' Une app. ', en: '' },
    keywords: { fr: [' Flutter ', ''], en: [] },
  },
};

describe('projectSeoSource', (): void => {
  it('trims the values of one language, blank search texts becoming null', (): void => {
    const media: ReadonlyMap<string, AdminMedia> = new Map([[MEDIA.id, MEDIA]]);
    expect(projectSeoSource(VALUES, 'fr', 'library-trails', media)).toEqual({
      slug: 'library-trails',
      title: 'Library Trails',
      summary: 'Covoiturage local.',
      techs: ['flutter'],
      cover: { src: MEDIA.src, small: null, width: 2400, height: 1350, alt: 'Accueil' },
      seo: { title: null, description: 'Une app.', keywords: ['Flutter'] },
    });
    expect(projectSeoSource(VALUES, 'en', 'library-trails', media).seo).toEqual({
      title: 'Library Trails in short',
      description: null,
      keywords: [],
    });
  });

  it('leaves the cover out while its media is unknown to the page', (): void => {
    expect(projectSeoSource(VALUES, 'fr', 'library-trails', new Map()).cover).toBeNull();
  });
});
