import { EMPTY_PROJECT_DRAFT } from '@internal/content-web-feature-admin/lib/constants/empty-project-draft.constants';
import type { ProjectFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/project-form-values.model';
import { seoPreview } from '@internal/content-web-feature-admin/lib/utils/seo-preview/seo-preview.utils';

/**
 * Function values
 *
 * @description
 * Form values with a title and summary in both languages and the given search texts.
 *
 * @param {Omit<ProjectFormValues['seo'], 'keywords'>} seo - Search texts.
 *
 * @returns {ProjectFormValues} Form values.
 */
const values = (seo: Omit<ProjectFormValues['seo'], 'keywords'>): ProjectFormValues => ({
  ...EMPTY_PROJECT_DRAFT,
  title: { fr: 'Library Trails', en: 'Library Trails EN' },
  summary: { fr: 'Covoiturage local.', en: 'Local carpooling.' },
  seo: { ...seo, keywords: { fr: [], en: [] } },
});

describe('seoPreview', (): void => {
  it('falls back on the title with the site name and on the summary', (): void => {
    const blank: ProjectFormValues = values({
      title: { fr: '  ', en: '' },
      description: { fr: '', en: '' },
    });
    expect(seoPreview(blank, 'fr', 'library-trails')).toEqual({
      title: 'Library Trails — Valentin Fortin',
      description: 'Covoiturage local.',
      breadcrumb: 'valentin-fortin.pro › fr › projects › library-trails',
    });
    expect(seoPreview(blank, 'en', 'library-trails')).toEqual({
      title: 'Library Trails EN — Valentin Fortin',
      description: 'Local carpooling.',
      breadcrumb: 'valentin-fortin.pro › en › projects › library-trails',
    });
    expect(seoPreview({ ...blank, title: { fr: '', en: '' } }, 'fr', 'library-trails').title).toBe(
      'Valentin Fortin',
    );
  });

  it('shows the custom texts as they are, trimmed', (): void => {
    const custom: ProjectFormValues = values({
      title: { fr: ' Library Trails, app de covoiturage ', en: '' },
      description: { fr: ' Une app. ', en: '' },
    });
    expect(seoPreview(custom, 'fr', 'library-trails')).toMatchObject({
      title: 'Library Trails, app de covoiturage',
      description: 'Une app.',
    });
  });

  it('cuts a long description at the last whole word, like a search snippet', (): void => {
    const long: string = `${'mot '.repeat(50)}fin`;
    const cut: string = seoPreview(
      values({ title: { fr: '', en: '' }, description: { fr: long, en: '' } }),
      'fr',
      'library-trails',
    ).description;
    expect(cut.endsWith('mot …')).toBe(true);
    expect(cut.length).toBeLessThanOrEqual(157);
    const word: string = 'x'.repeat(200);
    expect(
      seoPreview(
        values({ title: { fr: '', en: '' }, description: { fr: word, en: '' } }),
        'fr',
        'library-trails',
      ).description,
    ).toBe(`${'x'.repeat(155)} …`);
  });
});
