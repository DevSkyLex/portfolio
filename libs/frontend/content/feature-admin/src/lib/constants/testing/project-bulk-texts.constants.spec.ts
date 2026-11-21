import { PROJECT_BULK_TEXTS } from '@internal/content-web-feature-admin/lib/constants/project-bulk-texts.constants';

describe('PROJECT_BULK_TEXTS', (): void => {
  it('words the confirmation and the outcome of each bulk action in the singular and the plural', (): void => {
    expect(PROJECT_BULK_TEXTS.publish.confirmTitle('« Atlas »')).toBe('Publier « Atlas » ?');
    expect(PROJECT_BULK_TEXTS.publish.done(1)).toBe('1 article publié');
    expect(PROJECT_BULK_TEXTS.publish.done(3)).toBe('3 articles publiés');
    expect(PROJECT_BULK_TEXTS.publish.partial(1, 3)).toBe('1 article publié sur 3');
    expect(PROJECT_BULK_TEXTS.publish.partial(2, 3)).toBe('2 articles publiés sur 3');

    expect(PROJECT_BULK_TEXTS.unpublish.confirmTitle('2 articles')).toBe('Dépublier 2 articles ?');
    expect(PROJECT_BULK_TEXTS.unpublish.tone).toBe('danger');
    expect(PROJECT_BULK_TEXTS.unpublish.done(1)).toBe('1 article dépublié');
    expect(PROJECT_BULK_TEXTS.unpublish.done(2)).toBe('2 articles dépubliés');
    expect(PROJECT_BULK_TEXTS.unpublish.partial(1, 2)).toBe('1 article dépublié sur 2');
    expect(PROJECT_BULK_TEXTS.unpublish.partial(2, 4)).toBe('2 articles dépubliés sur 4');

    expect(PROJECT_BULK_TEXTS.feature.confirmTitle('« Atlas »')).toBe(
      'Mettre en avant « Atlas » ?',
    );
    expect(PROJECT_BULK_TEXTS.feature.done(1)).toBe('1 article mis en avant');
    expect(PROJECT_BULK_TEXTS.feature.done(2)).toBe('2 articles mis en avant');
    expect(PROJECT_BULK_TEXTS.feature.partial(1, 2)).toBe('1 article mis en avant sur 2');
    expect(PROJECT_BULK_TEXTS.feature.partial(2, 3)).toBe('2 articles mis en avant sur 3');

    expect(PROJECT_BULK_TEXTS.unfeature.confirmTitle('« Atlas »')).toBe(
      "Retirer « Atlas » de l'accueil ?",
    );
    expect(PROJECT_BULK_TEXTS.unfeature.done(1)).toBe("1 article retiré de l'accueil");
    expect(PROJECT_BULK_TEXTS.unfeature.done(2)).toBe("2 articles retirés de l'accueil");
    expect(PROJECT_BULK_TEXTS.unfeature.partial(1, 2)).toBe("1 article retiré de l'accueil sur 2");
    expect(PROJECT_BULK_TEXTS.unfeature.partial(2, 3)).toBe(
      "2 articles retirés de l'accueil sur 3",
    );
  });
});
