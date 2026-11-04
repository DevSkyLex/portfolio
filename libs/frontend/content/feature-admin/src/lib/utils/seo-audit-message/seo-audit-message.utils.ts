import type { SeoAuditIssue } from '@vfortin/content-web-data-access/admin';

/**
 * Function seoAuditMessage
 *
 * @description
 * French source message of an audit finding (D47), built from its code and its measured length,
 * limit, count or fields. `$localize` has no plural forms, so the image count has a `one` message
 * (the French singular, for 0 and 1) and an `other` one.
 *
 * @param {SeoAuditIssue} issue - Finding.
 *
 * @returns {string} Message.
 */
export function seoAuditMessage(issue: SeoAuditIssue): string {
  const length: number = issue.length ?? 0;
  const limit: number = issue.limit ?? 0;
  const count: number = issue.count ?? 0;
  switch (issue.code) {
    case 'search-title-missing':
      return $localize`:@@admin.dashboard.audit.issue.searchTitleMissing:Titre de recherche non renseigné : le titre du projet est utilisé.`;
    case 'search-title-too-short':
      return $localize`:@@admin.dashboard.audit.issue.searchTitleTooShort:Titre de recherche trop court : ${length}:length: caractères, ${limit}:limit: au minimum.`;
    case 'search-title-too-long':
      return $localize`:@@admin.dashboard.audit.issue.searchTitleTooLong:Titre de recherche trop long : ${length}:length: caractères, ${limit}:limit: au maximum.`;
    case 'search-description-missing':
      return $localize`:@@admin.dashboard.audit.issue.searchDescriptionMissing:Description de recherche non renseignée : le résumé du projet est utilisé.`;
    case 'search-description-too-short':
      return $localize`:@@admin.dashboard.audit.issue.searchDescriptionTooShort:Description de recherche trop courte : ${length}:length: caractères, ${limit}:limit: au minimum.`;
    case 'search-description-too-long':
      return $localize`:@@admin.dashboard.audit.issue.searchDescriptionTooLong:Description de recherche trop longue : ${length}:length: caractères, ${limit}:limit: au maximum.`;
    case 'keywords-missing':
      return issue.severity === 'info'
        ? $localize`:@@admin.dashboard.audit.issue.keywordsFromTechs:Aucun mot-clé : les technologies sont utilisées.`
        : $localize`:@@admin.dashboard.audit.issue.keywordsMissing:Aucun mot-clé ni technologie.`;
    case 'cover-missing':
      return $localize`:@@admin.dashboard.audit.issue.coverMissing:Pas d’image de couverture.`;
    case 'cover-alt-missing':
      return $localize`:@@admin.dashboard.audit.issue.coverAltMissing:Couverture sans texte alternatif.`;
    case 'image-alt-missing':
      return count < 2
        ? $localize`:@@admin.dashboard.audit.issue.imageAltMissing.one:${count}:count: image de l’article sans texte alternatif.`
        : $localize`:@@admin.dashboard.audit.issue.imageAltMissing.other:${count}:count: images de l’article sans texte alternatif.`;
    case 'translation-missing': {
      const fields: string = (issue.fields ?? []).join(', ');
      return fields
        ? $localize`:@@admin.dashboard.audit.issue.translationMissingFields:Traduction anglaise manquante : ${fields}:fields:.`
        : $localize`:@@admin.dashboard.audit.issue.translationMissing:Traduction anglaise manquante.`;
    }
  }
}
