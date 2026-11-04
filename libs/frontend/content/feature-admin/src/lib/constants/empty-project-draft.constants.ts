import { emptyArticleDocument } from '@vfortin/content-web-data-access/admin';
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
  period: null,
  client: { fr: '', en: '' },
  role: { fr: '', en: '' },
  place: { fr: '', en: '' },
  siteUrl: '',
  techs: [],
  featured: false,
  article: { fr: emptyArticleDocument(), en: emptyArticleDocument() },
  cover: { media: '', alt: { fr: '', en: '' } },
  seo: {
    title: { fr: '', en: '' },
    description: { fr: '', en: '' },
    keywords: { fr: [], en: [] },
  },
};
