import type { LegalDocumentKind } from '@vfortin/content-web-data-access/admin';
import type { LegalDocumentTexts } from '@internal/content-web-feature-admin/lib/models/legal-document-texts/legal-document-texts.interface';

/**
 * Constant LEGAL_DOCUMENT_TEXTS
 *
 * @description
 * Copy of each legal document, in tab order; `path` is the French public address, the English page
 * being under `/en`.
 */
export const LEGAL_DOCUMENT_TEXTS: Readonly<Record<LegalDocumentKind, LegalDocumentTexts>> = {
  notice: {
    tab: $localize`:@@admin.legal.notice.tab:Mentions légales`,
    description: $localize`:@@admin.legal.notice.description:Éditeur, directeur de la publication, hébergeur et contact. Chaque intertitre ouvre une section de la page.`,
    path: '/legal-notice',
  },
  privacy: {
    tab: $localize`:@@admin.legal.privacy.tab:Confidentialité`,
    description: $localize`:@@admin.legal.privacy.description:Données collectées, finalités et base légale, durée de conservation, cookies, droits et contact. Chaque intertitre ouvre une section de la page.`,
    path: '/privacy',
  },
};
