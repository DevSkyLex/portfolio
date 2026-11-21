import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SiteContentService } from '@vfortin/content-web-data-access';
import { FaqSectionComponent } from '@internal/content-web-feature/lib/ui/sections/faq-section/faq-section.component';
import { JourneySectionComponent } from '@internal/content-web-feature/lib/ui/sections/journey-section/journey-section.component';
import { ProjectsSectionComponent } from '@internal/content-web-feature/lib/ui/sections/projects-section/projects-section.component';
import { SkillsSectionComponent } from '@internal/content-web-feature/lib/ui/sections/skills-section/skills-section.component';

/**
 * Component ContentSectionsComponent
 * @class ContentSectionsComponent
 *
 * @description
 * Composes the home page projects, journey, skills and FAQ in their public order.
 * The FAQ, last before the contact and only when the snapshot holds a question, is prerendered and
 * hydrated on approach like the contact section (D16, D22), which keeps its accordion out of the
 * initial bundle.
 */
@Component({
  selector: 'content-sections',
  imports: [
    FaqSectionComponent,
    JourneySectionComponent,
    ProjectsSectionComponent,
    SkillsSectionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <content-projects-section />
    <content-journey-section />
    <content-skills-section />
    @if (content.faq().length > 0) {
      <!-- Below the fold: prerendered HTML, accordion code loaded on approach. -->
      @defer (hydrate on viewport) {
        <content-faq-section />
      } @placeholder {
        <div class="min-h-screen scroll-mt-24" id="faq"></div>
      }
    }
  `,
})
export class ContentSectionsComponent {
  // #region Properties
  /**
   * Property content
   * @readonly
   *
   * @description
   * Content view model, read for whether the FAQ has a question to defer.
   *
   * @type {SiteContentService}
   */
  protected readonly content: SiteContentService = inject<SiteContentService>(SiteContentService);
  // #endregion
}
