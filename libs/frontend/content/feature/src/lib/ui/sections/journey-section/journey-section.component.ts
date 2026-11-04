import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SiteContentService } from '@vfortin/content-web-data-access';
import { TimelineComponent } from '@vfortin/content-web-ui';
import { SectionFxDirective } from '@vfortin/ui';

/**
 * Component JourneySectionComponent
 * @class JourneySectionComponent
 *
 * @description
 * Supplies locale-specific education and experience entries to the timeline presentation component.
 */
@Component({
  selector: 'content-journey-section',
  imports: [SectionFxDirective, TimelineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="block" id="journey" uiSectionFx aria-labelledby="journey-title">
      <content-timeline
        [steps]="content.timeline()"
        i18n-educationLabel="@@timeline.education"
        educationLabel="Formation"
        i18n-experienceLabel="@@timeline.experience"
        experienceLabel="Expérience"
      >
        <h2
          class="font-display text-[64px] leading-[68px] font-semibold tracking-[-0.035em] text-fg @max-3xl:text-[36px] @max-3xl:leading-[42px]"
          id="journey-title"
          i18n="@@section.timeline"
        >
          Parcours
        </h2>
      </content-timeline>
    </section>
  `,
})
export class JourneySectionComponent {
  // #region Properties
  /**
   * Property content
   * @readonly
   *
   * @description
   * Content view model supplying timeline entries for the active locale.
   *
   * @type {SiteContentService}
   */
  protected readonly content: SiteContentService = inject<SiteContentService>(SiteContentService);
  // #endregion
}
