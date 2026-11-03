import type { ArticleSection } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/article-section.model';

/**
 * Constant ARTICLE_SECTION_LABELS
 *
 * @description
 * French labels of the article sections, used by the form fields and the paragraph-alignment message.
 *
 * @type {Readonly<Record<ArticleSection, string>>}
 */
export const ARTICLE_SECTION_LABELS: Readonly<Record<ArticleSection, string>> = {
  context: 'Contexte',
  work: 'Ce que j’ai fait',
  workList: 'Liste du travail',
  choices: 'Choix',
  result: 'Résultat',
  lessons: 'Ce que j’en retiens',
  captions: 'Légendes des images',
};
