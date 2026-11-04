import { seoAuditMessage } from '@internal/content-web-feature-admin/lib/utils/seo-audit-message/seo-audit-message.utils';

describe('seoAuditMessage', (): void => {
  it('says what to fix with the measured length and its limit', (): void => {
    expect(
      seoAuditMessage({
        code: 'search-title-too-long',
        severity: 'warning',
        locale: 'fr',
        length: 82,
        limit: 70,
      }),
    ).toBe('Titre de recherche trop long : 82 caractères, 70 au maximum.');
    expect(
      seoAuditMessage({
        code: 'search-description-too-short',
        severity: 'warning',
        locale: 'en',
        length: 40,
        limit: 70,
      }),
    ).toBe('Description de recherche trop courte : 40 caractères, 70 au minimum.');
  });

  it('tells the fallback keywords from none, and counts images with a real plural', (): void => {
    expect(seoAuditMessage({ code: 'keywords-missing', severity: 'info', locale: 'fr' })).toBe(
      'Aucun mot-clé : les technologies sont utilisées.',
    );
    expect(seoAuditMessage({ code: 'keywords-missing', severity: 'warning', locale: 'fr' })).toBe(
      'Aucun mot-clé ni technologie.',
    );
    expect(
      seoAuditMessage({ code: 'image-alt-missing', severity: 'error', locale: 'fr', count: 1 }),
    ).toBe('1 image de l’article sans texte alternatif.');
    expect(
      seoAuditMessage({ code: 'image-alt-missing', severity: 'error', locale: 'en', count: 3 }),
    ).toBe('3 images de l’article sans texte alternatif.');
  });

  it('names the untranslated fields', (): void => {
    expect(
      seoAuditMessage({
        code: 'translation-missing',
        severity: 'error',
        locale: 'en',
        fields: ['title.en', 'article.en'],
      }),
    ).toBe('Traduction anglaise manquante : title.en, article.en.');
    expect(seoAuditMessage({ code: 'translation-missing', severity: 'error', locale: 'en' })).toBe(
      'Traduction anglaise manquante.',
    );
    expect(seoAuditMessage({ code: 'cover-alt-missing', severity: 'error', locale: 'fr' })).toBe(
      'Couverture sans texte alternatif.',
    );
  });
});
