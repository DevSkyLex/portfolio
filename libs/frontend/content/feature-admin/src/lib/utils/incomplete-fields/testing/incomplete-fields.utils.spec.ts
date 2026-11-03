import { EMPTY_PROJECT_DRAFT } from '@internal/content-web-feature-admin/lib/constants/empty-project-draft.constants';
import type { ProjectFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/project-form-values.model';
import { incompleteFields } from '@internal/content-web-feature-admin/lib/utils/incomplete-fields/incomplete-fields.utils';

/**
 * Function filled
 *
 * @description
 * Builds form values whose every field has a French and an English text of one paragraph.
 *
 * @returns {ProjectFormValues} Complete form values.
 */
const filled: () => ProjectFormValues = (): ProjectFormValues => {
  const both: { fr: string; en: string } = { fr: 'Texte.', en: 'Text.' };
  return {
    ...EMPTY_PROJECT_DRAFT,
    title: both,
    summary: both,
    lead: both,
    periodLabel: both,
    client: both,
    role: both,
    place: both,
    article: {
      context: both,
      work: both,
      workList: both,
      choices: both,
      result: both,
      lessons: both,
      captions: both,
    },
  };
};

describe('incompleteFields', (): void => {
  it('reports nothing for complete values in either language', (): void => {
    expect(incompleteFields(filled(), 'fr')).toEqual([]);
    expect(incompleteFields(filled(), 'en')).toEqual([]);
  });

  it('reports every field of blank values, with the API paths', (): void => {
    expect(incompleteFields(EMPTY_PROJECT_DRAFT, 'en')).toEqual([
      'title.en',
      'summary.en',
      'lead.en',
      'periodLabel.en',
      'client.en',
      'role.en',
      'place.en',
      'article.context.en',
      'article.work.en',
      'article.workList.en',
      'article.choices.en',
      'article.result.en',
      'article.lessons.en',
      'article.captions.en',
    ]);
  });

  it('treats whitespace as empty and a section without French paragraph as incomplete everywhere', (): void => {
    const values: ProjectFormValues = filled();
    values.title = { fr: '  ', en: 'Title' };
    values.article.captions = { fr: '\n\n', en: 'Caption.' };
    expect(incompleteFields(values, 'fr')).toEqual(['title.fr', 'article.captions.fr']);
    expect(incompleteFields(values, 'en')).toEqual(['article.captions.en']);
  });

  it('reports an English section missing a paragraph or holding the untranslated marker', (): void => {
    const values: ProjectFormValues = filled();
    values.article.context = { fr: 'Un.\n\nDeux.', en: 'One.' };
    values.article.work = { fr: 'Un.\n\nDeux.', en: '[à traduire]\n\nTwo.' };
    values.article.result = { fr: 'Un.\n\nDeux.', en: 'One.\n\n  \n\nTwo.' };
    expect(incompleteFields(values, 'en')).toEqual(['article.context.en', 'article.work.en']);
    expect(incompleteFields(values, 'fr')).toEqual([]);
  });
});
