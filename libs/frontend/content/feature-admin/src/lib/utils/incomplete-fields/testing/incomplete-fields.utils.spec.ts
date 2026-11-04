import type { ArticleDocumentDraft } from '@vfortin/content-web-data-access/admin';
import { EMPTY_PROJECT_DRAFT } from '@internal/content-web-feature-admin/lib/constants/empty-project-draft.constants';
import type { ProjectFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/project-form-values.model';
import { incompleteFields } from '@internal/content-web-feature-admin/lib/utils/incomplete-fields/incomplete-fields.utils';

/**
 * Constant MEDIA
 *
 * @description
 * Media id of the figures and the cover.
 */
const MEDIA: string = '3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90';

/**
 * Function text
 *
 * @description
 * Builds a document of one paragraph.
 *
 * @param {string} value - Paragraph text.
 *
 * @returns {ArticleDocumentDraft} One-paragraph document.
 */
const text: (value: string) => ArticleDocumentDraft = (value: string): ArticleDocumentDraft => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }],
});

/**
 * Function filled
 *
 * @description
 * Builds form values whose every field has a French and an English text, with a described cover.
 *
 * @returns {ProjectFormValues} Complete form values.
 */
const filled: () => ProjectFormValues = (): ProjectFormValues => {
  const both: () => { fr: string; en: string } = (): { fr: string; en: string } => ({
    fr: 'Texte.',
    en: 'Text.',
  });
  return {
    ...EMPTY_PROJECT_DRAFT,
    title: both(),
    summary: both(),
    lead: both(),
    period: { start: { year: 2023, month: null }, end: null },
    client: both(),
    role: both(),
    place: both(),
    article: { fr: text('Un.'), en: text('One.') },
    cover: { media: MEDIA, alt: { fr: 'Couverture', en: 'Cover' } },
  };
};

describe('incompleteFields', (): void => {
  it('reports nothing for complete values in either language', (): void => {
    expect(incompleteFields(filled(), 'fr')).toEqual([]);
    expect(incompleteFields(filled(), 'en')).toEqual([]);
  });

  it('reports every text of blank values, with the API paths, no cover alt without cover and no period', (): void => {
    expect(incompleteFields(EMPTY_PROJECT_DRAFT, 'en')).toEqual([
      'title.en',
      'summary.en',
      'lead.en',
      'client.en',
      'role.en',
      'place.en',
      'article.en',
    ]);
  });

  it('treats whitespace as empty, and reports figures and a cover without alternative text', (): void => {
    const values: ProjectFormValues = filled();
    values.title = { fr: '  ', en: 'Title' };
    values.article.fr = text('  ');
    values.article.en = {
      type: 'doc',
      content: [{ type: 'figure', attrs: { media: MEDIA, alt: ' ', caption: 'Légende' } }],
    };
    values.cover.alt.en = '';
    expect(incompleteFields(values, 'fr')).toEqual(['title.fr', 'article.fr']);
    expect(incompleteFields(values, 'en')).toEqual(['article.en.figures', 'cover.alt.en']);
  });
});
