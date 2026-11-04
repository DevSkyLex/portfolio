import { type Provider, inject } from '@angular/core';
import { SiteContentService } from '@vfortin/content-web-data-access';
import {
  COOKIE_PREFERENCES,
  LEGAL_DOCUMENTS,
  type LegalDocumentSource,
} from '@vfortin/legal-web-feature';
import { ConsentService } from '@internal/web-shell/lib/consent/consent.service';

/**
 * Function provideLegalDocuments
 *
 * @description
 * Binds the legal pages' port to the content snapshot: the documents are content (edited on the
 * « Légal » administration page), and the legal context reads no content library, so the shell
 * composes the two (boundaries.md). Mounted on the public routes guarded by `publicContentGuard`, so
 * the snapshot is read before a page asks for its document.
 *
 * @returns {Provider} `LEGAL_DOCUMENTS` provider.
 */
export function provideLegalDocuments(): Provider {
  return {
    provide: LEGAL_DOCUMENTS,
    useFactory: (): LegalDocumentSource => {
      const content: SiteContentService = inject<SiteContentService>(SiteContentService);
      // The content view model is structurally the legal one: no mapping, no shared type.
      return {
        document: (
          kind: Parameters<LegalDocumentSource['document']>[0],
        ): ReturnType<LegalDocumentSource['document']> => content.legal(kind),
      };
    },
  };
}

/**
 * Function provideCookiePreferences
 *
 * @description
 * Binds the privacy page's « Gérer les cookies » port to the consent service (D48); the legal context
 * reads no shell code, as for `LEGAL_DOCUMENTS`.
 *
 * @returns {Provider} `COOKIE_PREFERENCES` provider.
 */
export function provideCookiePreferences(): Provider {
  return { provide: COOKIE_PREFERENCES, useExisting: ConsentService };
}
