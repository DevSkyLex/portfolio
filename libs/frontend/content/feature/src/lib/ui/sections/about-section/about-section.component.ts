import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SiteContentService } from '@vfortin/content-web-data-access';
import { ScrollWordsComponent } from '@vfortin/content-web-ui';
import {
  DecoComponent,
  RevealDirective,
  SECTION_FX_CONTENT,
  ScrollProgressDirective,
  SectionFxDirective,
  SectionHeadingComponent,
} from '@vfortin/ui';
import { ABOUT_DECO } from '@internal/content-web-feature/lib/ui/sections/about-section/constants/about-deco.constants';

/**
 * Component AboutSectionComponent
 * @class AboutSectionComponent
 *
 * @description
 * Renders profile statement, portrait placeholder, supporting copy, and facts from the active content snapshot.
 */
@Component({
  selector: 'content-about-section',
  imports: [
    DecoComponent,
    RevealDirective,
    ScrollProgressDirective,
    ScrollWordsComponent,
    SectionFxDirective,
    SectionHeadingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="@container relative bg-surface pt-80 shadow-[0_-1px_0_var(--surface)] @max-[768px]:pt-[400px]"
      id="about"
      uiSectionFx
      aria-labelledby="about-title"
    >
      <ui-deco [glyphs]="deco" />
      <div class="relative z-1 wrap" [class]="sectionFx">
        <ui-section-heading headingId="about-title" i18n="@@section.about"
          >À propos</ui-section-heading
        >
        @let profile = content.profile();
        <div class="flex flex-col gap-16 @max-[768px]:gap-12">
          <content-scroll-words
            class="max-w-[1040px] text-[44px] leading-[54px] font-medium tracking-[-0.02em] text-pretty text-fg @max-[768px]:text-[26px] @max-[768px]:leading-[34px]"
            [text]="profile.aboutStatement"
          />
          <div
            class="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start gap-16 @max-[960px]:grid-cols-[minmax(0,1fr)]"
          >
            <figure
              class="flex w-full max-w-[420px] flex-col gap-3 justify-self-start transition-[opacity,translate] duration-(--dur-reveal) ease-orbit in-data-js:not-data-in:translate-y-6 in-data-js:not-data-in:opacity-0 motion-reduce:transition-none @max-[960px]:max-w-[320px] @max-[768px]:max-w-60"
              aria-hidden="true"
              uiReveal
            >
              <div
                class="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-xl bg-surface-raised [clip-path:inset(calc((1-var(--e,1))*9%)_round_12px)]"
                uiScrollProgress
              >
                <div
                  class="absolute inset-0 grid [transform:scale(calc(1+(1-var(--e,1))*0.25))] place-items-center p-6 text-fg-faint"
                >
                  <p class="font-mono text-data" i18n="@@about.photoPlaceholder">[Photo]</p>
                </div>
              </div>
            </figure>
            <div
              class="flex flex-col gap-8 transition-[opacity,translate] delay-80 duration-(--dur-reveal) ease-orbit in-data-js:not-data-in:translate-y-6 in-data-js:not-data-in:opacity-0 motion-reduce:transition-none"
              uiReveal
            >
              <p
                class="max-w-[620px] text-xl leading-8 text-pretty text-fg @max-[768px]:text-lg @max-[768px]:leading-7"
              >
                {{ profile.aboutLead }}
              </p>
              <dl
                class="grid grid-cols-[180px_minmax(0,1fr)] @max-[768px]:grid-cols-[minmax(0,1fr)]"
              >
                @for (fact of profile.facts; track fact.label) {
                  <div class="contents">
                    <dt
                      class="border-t border-border py-4 text-base leading-6 text-fg-muted @max-[768px]:pb-0"
                    >
                      {{ fact.label }}
                    </dt>
                    <dd
                      class="border-t border-border py-4 text-base leading-6 text-fg @max-[768px]:border-t-0 @max-[768px]:pt-1"
                    >
                      {{ fact.value }}
                    </dd>
                  </div>
                }
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class AboutSectionComponent {
  // #region Properties
  /**
   * Property content
   * @readonly
   *
   * @description
   * Locale-specific public content used to populate the profile section.
   *
   * @type {SiteContentService}
   */
  protected readonly content: SiteContentService = inject<SiteContentService>(SiteContentService);

  /**
   * Property deco
   * @readonly
   *
   * @description
   * Decorative glyphs positioned around the section content.
   *
   * @type {readonly DecoGlyph[]}
   */
  protected readonly deco: typeof ABOUT_DECO = ABOUT_DECO;

  /**
   * Property sectionFx
   * @readonly
   *
   * @description
   * Shared content-section animation classes applied to the section wrapper.
   *
   * @type {string}
   */
  protected readonly sectionFx: string = SECTION_FX_CONTENT;
  // #endregion
}
