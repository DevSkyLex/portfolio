import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { LegalDocument } from '@internal/legal-web-feature/lib/models/legal-document/legal-document.interface';
import type { LegalDocumentSource } from '@internal/legal-web-feature/lib/models/legal-document/legal-document-source.interface';
import { LEGAL_DOCUMENTS } from '@internal/legal-web-feature/lib/tokens/legal-documents/legal-documents.token';
import { LegalDocumentComponent } from '@internal/legal-web-feature/lib/ui/components/legal-document/legal-document.component';

/**
 * Component LegalNoticePageComponent
 * @class LegalNoticePageComponent
 *
 * @description
 * Renders the site's legal notice (publisher, publication director, host, intellectual property,
 * external links, personal data) from the content snapshot, as edited on the « Légal » page.
 */
@Component({
  selector: 'legal-notice-page',
  imports: [LegalDocumentComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<legal-document [heading]="heading" [document]="document" />`,
})
export class LegalNoticePageComponent {
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
  protected readonly heading: string = $localize`:@@legal.notice.title:Mentions légales`;

  /**
   * Property document
   * @readonly
   *
   * @description
   * Legal notice of the active locale.
   *
   * @type {LegalDocument}
   */
  protected readonly document: LegalDocument =
    inject<LegalDocumentSource>(LEGAL_DOCUMENTS).document('notice');
  // #endregion
}
