import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import type { LegalDocument } from '@internal/legal-web-feature/lib/models/legal-document/legal-document.interface';
import { LegalArticleComponent } from '@internal/legal-web-feature/lib/ui/components/legal-article/legal-article.component';
import { LegalBlocksComponent } from '@internal/legal-web-feature/lib/ui/components/legal-blocks/legal-blocks.component';

/**
 * Component LegalDocumentComponent
 * @class LegalDocumentComponent
 *
 * @description
 * Lays a legal document out in the legal article: its introduction, then one `section` per level-2
 * heading, labelled by it (the static pages' structure), then the projected page content (the privacy
 * page's « Gérer les cookies »). Heading ids take a `legal-` prefix so that a section titled
 * « Contact » never collides with an id of the layout.
 */
@Component({
  selector: 'legal-document',
  imports: [LegalArticleComponent, LegalBlocksComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `@let current = document();
    <legal-article [heading]="heading()" [updatedOn]="current.updatedOn">
      @if (current.intro.length > 0) {
        <section>
          <legal-blocks [blocks]="current.intro" />
        </section>
      }
      @for (section of current.sections; track section.id) {
        <section [attr.aria-labelledby]="'legal-' + section.id">
          <h2 [id]="'legal-' + section.id">{{ section.label }}</h2>
          <legal-blocks [blocks]="section.blocks" />
        </section>
      }
      <ng-content />
    </legal-article>`,
})
export class LegalDocumentComponent {
  // #region Properties
  /**
   * Property heading
   * @readonly
   *
   * @description
   * Localized page title.
   *
   * @type {InputSignal<string>}
   */
  public readonly heading: InputSignal<string> = input.required<string>();

  /**
   * Property document
   * @readonly
   *
   * @description
   * Document to render.
   *
   * @type {InputSignal<LegalDocument>}
   */
  public readonly document: InputSignal<LegalDocument> = input.required<LegalDocument>();
  // #endregion
}
