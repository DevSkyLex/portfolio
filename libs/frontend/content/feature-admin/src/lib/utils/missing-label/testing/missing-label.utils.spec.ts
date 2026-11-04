import { missingLabel } from '@internal/content-web-feature-admin/lib/utils/missing-label/missing-label.utils';

describe('missingLabel', (): void => {
  it('names each missing path of the API in French', (): void => {
    expect(
      [
        'title.en',
        'summary.fr',
        'article.en',
        'article.fr.figures',
        'cover.alt.en',
        'unknown.en',
        'title',
        'title.de',
      ].map(missingLabel),
    ).toEqual([
      'Titre (anglais)',
      'Résumé (français)',
      'Article (anglais)',
      'Textes alternatifs des images (français)',
      'Texte alternatif de la couverture (anglais)',
      'unknown.en',
      'title',
      'title.de',
    ]);
  });
});
