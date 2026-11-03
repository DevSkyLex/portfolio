import { ARTICLE_SECTIONS } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/article-section.model';
import type { ProjectFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/project-form-values.model';

/**
 * Constant EMPTY_PROJECT_DRAFT
 *
 * @description
 * Blank project form values, held until the first initial values reach the form.
 *
 * @type {ProjectFormValues}
 */
export const EMPTY_PROJECT_DRAFT: ProjectFormValues = {
  title: { fr: '', en: '' },
  summary: { fr: '', en: '' },
  lead: { fr: '', en: '' },
  periodLabel: { fr: '', en: '' },
  client: { fr: '', en: '' },
  role: { fr: '', en: '' },
  place: { fr: '', en: '' },
  siteUrl: '',
  techs: '',
  featured: false,
  article: Object.fromEntries(
    ARTICLE_SECTIONS.map(
      (
        section: 'choices' | 'result' | 'work' | 'context' | 'workList' | 'lessons' | 'captions',
      ): [
        'choices' | 'result' | 'work' | 'context' | 'workList' | 'lessons' | 'captions',
        { fr: string; en: string },
      ] => [section, { fr: '', en: '' }],
    ),
  ) as ProjectFormValues['article'],
};
