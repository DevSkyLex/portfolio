import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonDirective } from '@vfortin/ui';
import type { CookiePreferences } from '@internal/legal-web-feature/lib/models/cookie-preferences/cookie-preferences.interface';
import type { LegalDocument } from '@internal/legal-web-feature/lib/models/legal-document/legal-document.interface';
import type { LegalDocumentSource } from '@internal/legal-web-feature/lib/models/legal-document/legal-document-source.interface';
import { COOKIE_PREFERENCES } from '@internal/legal-web-feature/lib/tokens/cookie-preferences/cookie-preferences.token';
import { LEGAL_DOCUMENTS } from '@internal/legal-web-feature/lib/tokens/legal-documents/legal-documents.token';
import { LegalDocumentComponent } from '@internal/legal-web-feature/lib/ui/components/legal-document/legal-document.component';

/**
 * Component PrivacyPageComponent
 * @class PrivacyPageComponent
 *
 * @description
 * Renders the site's privacy policy (controller, data collected, purpose and legal basis,
 * recipients, retention, cookies, rights) from the content snapshot, as edited on the « Légal » page,
 * followed by « Gérer les cookies » when the site measures its audience (D48).
 */
@Component({
  selector: 'legal-privacy-page',
  imports: [ButtonDirective, LegalDocumentComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<legal-document [heading]="heading" [document]="document">
    @if (cookies?.enabled) {
      <div>
        <button
          uiBtn
          variant="secondary"
          type="button"
          (click)="cookies.openPreferences()"
          i18n="@@consent.manage"
        >
          Gérer les cookies
        </button>
      </div>
    }
  </legal-document>`,
})
export class PrivacyPageComponent {
  // #region Properties
  /**
   * Property heading
   * @readonly
   *
   * @description
   * Localized page heading.
   *
   * @type {string}
   */
  protected readonly heading: string = $localize`:@@legal.privacy.title:Politique de confidentialité`;

  /**
   * Property document
   * @readonly
   *
   * @description
   * Privacy policy of the active locale.
   *
   * @type {LegalDocument}
   */
  protected readonly document: LegalDocument =
    inject<LegalDocumentSource>(LEGAL_DOCUMENTS).document('privacy');

  /**
   * Property cookies
   * @readonly
   *
   * @description
   * Cookie preferences of the site, `null` when the shell provides none.
   *
   * @type {CookiePreferences | null}
   */
  protected readonly cookies: CookiePreferences | null = inject<CookiePreferences>(
    COOKIE_PREFERENCES,
    { optional: true },
  );
  // #endregion
}
