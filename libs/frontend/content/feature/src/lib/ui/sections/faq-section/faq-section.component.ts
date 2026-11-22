import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SiteContentService } from '@vfortin/content-web-data-access';
import {
  AccordionContentComponent,
  AccordionDirective,
  AccordionItemDirective,
  AccordionTriggerDirective,
  SECTION_FX_CONTENT,
  SectionFxDirective,
  SectionHeadingComponent,
} from '@vfortin/ui';

/**
 * Component FaqSectionComponent
 * @class FaqSectionComponent
 *
 * @description
 * « Questions fréquentes » of the home page, after « À propos »: the snapshot's questions in editorial
 * order as one accordion (one answer open at a time, closable), each answer plain text whose line
 * breaks are kept. The heading reveal is the section's motion accent. Without a question, no section
 * renders (the layout leaves its link out, `SiteSectionsService`).
 */
@Component({
  selector: 'content-faq-section',
  imports: [
    AccordionContentComponent,
    AccordionDirective,
    AccordionItemDirective,
    AccordionTriggerDirective,
    SectionFxDirective,
    SectionHeadingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (content.faq().length > 0) {
      <section
        class="@container relative bg-surface pt-40 shadow-[0_-1px_0_var(--surface)] @max-[768px]:pt-24"
        id="faq"
        uiSectionFx
        aria-labelledby="faq-title"
      >
        <div class="relative z-1 wrap" [class]="sectionFx">
          <ui-section-heading headingId="faq-title" i18n="@@section.faq"
            >Questions fréquentes</ui-section-heading
          >
          <div class="w-full border-t border-border" uiAccordion type="single" collapsible>
            @for (entry of content.faq(); track entry.id) {
              <div uiAccordionItem [value]="entry.id">
                <h3>
                  <button
                    class="group/faq py-6 text-xl leading-8 font-medium @max-[768px]:text-lg @max-[768px]:leading-7"
                    uiAccordionTrigger
                  >
                    <span class="flex items-baseline gap-5 @max-[768px]:gap-3">
                      <span
                        class="font-mono text-xl text-fg-faint tabular-nums @max-[768px]:text-lg"
                        aria-hidden="true"
                        >{{ $index < 9 ? '0' : '' }}{{ $index + 1 }}</span
                      >
                      <span>{{ entry.question }}</span>
                    </span>
                    <!-- Plus that turns into a minus: the vertical bar folds away when the answer opens. -->
                    <span
                      class="relative grid size-9 shrink-0 place-items-center rounded-full border-2 border-border text-fg transition-colors duration-(--dur-pop) ease-orbit group-hover/faq:border-fg group-data-[state=open]/faq:border-fill group-data-[state=open]/faq:bg-fill group-data-[state=open]/faq:text-on-fill motion-reduce:transition-none"
                      aria-hidden="true"
                    >
                      <span class="absolute h-[1.5px] w-3 rounded-full bg-current"></span>
                      <span
                        class="absolute h-3 w-[1.5px] rounded-full bg-current transition-transform duration-(--dur-roll) ease-orbit group-data-[state=open]/faq:scale-y-0 motion-reduce:transition-none"
                      ></span>
                    </span>
                  </button>
                </h3>
                <ui-accordion-content>
                  <!--
                    Plain text whose line breaks are its only structure: bound as text, so no
                    template whitespace reaches the pre-line rendering.
                  -->
                  <p
                    class="max-w-[720px] pb-2 text-base leading-7 whitespace-pre-line"
                    [textContent]="entry.answer"
                  ></p>
                </ui-accordion-content>
              </div>
            }
          </div>
        </div>
      </section>
    }
  `,
})
export class FaqSectionComponent {
  // #region Properties
  /**
   * Property content
   * @readonly
   *
   * @description
   * Content view model supplying the questions of the active locale.
   *
   * @type {SiteContentService}
   */
  protected readonly content: SiteContentService = inject<SiteContentService>(SiteContentService);

  /**
   * Property sectionFx
   * @readonly
   *
   * @description
   * Shared content-section animation classes for the FAQ wrapper.
   *
   * @type {string}
   */
  protected readonly sectionFx: string = SECTION_FX_CONTENT;
  // #endregion
}
