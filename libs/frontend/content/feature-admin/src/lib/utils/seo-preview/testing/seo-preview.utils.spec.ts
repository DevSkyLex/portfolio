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
  title: { fr: 'Movah', en: 'Movah EN' },
  summary: { fr: 'Covoiturage local.', en: 'Local carpooling.' },
  seo: { ...seo, keywords: { fr: [], en: [] } },
});

describe('seoPreview', (): void => {
  it('falls back on the title with the site name and on the summary', (): void => {
    const blank: ProjectFormValues = values({
      title: { fr: '  ', en: '' },
      description: { fr: '', en: '' },
    });
    expect(seoPreview(blank, 'fr', 'movah')).toEqual({
      title: 'Movah — Valentin Fortin',
      description: 'Covoiturage local.',
      breadcrumb: 'valentin-fortin.pro › fr › projects › movah',
    });
    expect(seoPreview(blank, 'en', 'movah')).toEqual({
      title: 'Movah EN — Valentin Fortin',
      description: 'Local carpooling.',
      breadcrumb: 'valentin-fortin.pro › en › projects › movah',
    });
    expect(seoPreview({ ...blank, title: { fr: '', en: '' } }, 'fr', 'movah').title).toBe(
      'Valentin Fortin',
    );
  });

  it('shows the custom texts as they are, trimmed', (): void => {
    const custom: ProjectFormValues = values({
      title: { fr: ' Movah, app de covoiturage ', en: '' },
      description: { fr: ' Une app. ', en: '' },
    });
    expect(seoPreview(custom, 'fr', 'movah')).toMatchObject({
      title: 'Movah, app de covoiturage',
      description: 'Une app.',
    });
  });

  it('cuts a long description at the last whole word, like a search snippet', (): void => {
    const long: string = `${'mot '.repeat(50)}fin`;
    const cut: string = seoPreview(
      values({ title: { fr: '', en: '' }, description: { fr: long, en: '' } }),
      'fr',
      'movah',
    ).description;
    expect(cut.endsWith('mot …')).toBe(true);
    expect(cut.length).toBeLessThanOrEqual(157);
    const word: string = 'x'.repeat(200);
    expect(
      seoPreview(
        values({ title: { fr: '', en: '' }, description: { fr: word, en: '' } }),
        'fr',
        'movah',
      ).description,
    ).toBe(`${'x'.repeat(155)} …`);
  });
});
