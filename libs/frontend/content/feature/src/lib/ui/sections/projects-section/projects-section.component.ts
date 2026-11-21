import { RouterLink } from '@angular/router';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SiteContentService } from '@vfortin/content-web-data-access';
import { ProjectCardComponent, type ProjectTint } from '@vfortin/content-web-ui';
import { NgIcon } from '@ng-icons/core';
import { lucideArrowRight } from '@ng-icons/lucide';
import {
  DecoComponent,
  SECTION_FX_CONTENT,
  SectionFxDirective,
  SectionHeadingComponent,
} from '@vfortin/ui';
import { PROJECT_CARD_TINTS } from '@internal/content-web-feature/lib/ui/sections/projects-section/constants/project-card-tints.constants';
import { PROJECTS_DECO } from '@internal/content-web-feature/lib/ui/sections/projects-section/constants/projects-deco.constants';

/**
 * Component ProjectsSectionComponent
 * @class ProjectsSectionComponent
 *
 * @description
 * Renders the featured project and remaining project cards with the section transition from the hero,
 * then a full-width link to every project in the catalogue.
 */
@Component({
  selector: 'content-projects-section',
  imports: [
    NgIcon,
    RouterLink,
    DecoComponent,
    ProjectCardComponent,
    SectionFxDirective,
    SectionHeadingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="@container relative bg-surface pt-40 shadow-[0_-1px_0_var(--surface)] before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-[min(640px,70vh)] before:bg-[linear-gradient(to_bottom,transparent_0%,color-mix(in_srgb,var(--surface)_6%,transparent)_18%,color-mix(in_srgb,var(--surface)_18%,transparent)_34%,color-mix(in_srgb,var(--surface)_36%,transparent)_50%,color-mix(in_srgb,var(--surface)_58%,transparent)_66%,color-mix(in_srgb,var(--surface)_80%,transparent)_82%,color-mix(in_srgb,var(--surface)_94%,transparent)_93%,var(--surface)_100%)] @max-[768px]:before:h-[360px]"
      id="projects"
      uiSectionFx
      aria-labelledby="projects-title"
    >
      <ui-deco [glyphs]="deco" />
      <div class="relative z-1 wrap" [class]="sectionFx">
        <ui-section-heading headingId="projects-title" i18n="@@section.projects"
          >Projets</ui-section-heading
        >
        <div
          class="grid grid-cols-3 gap-x-8 gap-y-16 pb-1 @max-[960px]:grid-cols-2 @max-[768px]:grid-cols-1 @max-[768px]:gap-12"
        >
          @if (content.featuredProject(); as featured) {
            <content-project-card
              [project]="featured"
              [link]="['/articles', featured.slug]"
              [featured]="true"
              [tint]="tint(0)"
            />
          }
          @for (
            project of content.otherProjects().slice(0, content.featuredProject() ? 3 : 4);
            track project.slug;
            let i = $index
          ) {
            <content-project-card
              [project]="project"
              [link]="['/articles', project.slug]"
              [tint]="tint(i + 1)"
              [delay]="i * 80"
            />
          }
        </div>
        @if (content.projects().length > 0) {
          <!--
            An editorial row rather than a button: the rule above draws the aurora on hover, the round
            arrow turns from north-east to east and fills; named by its title, described by its line.
          -->
          <a
            class="group/more relative mt-12 flex items-center justify-between gap-6 rounded-xs border-t border-border pt-6 outline-2 outline-offset-8 outline-transparent after:absolute after:inset-x-0 after:-top-px after:h-px after:origin-left after:scale-x-0 after:bg-linear-to-r after:from-aurora-pink after:via-aurora-violet after:to-aurora-cyan after:transition-transform after:duration-(--dur-roll) after:ease-orbit hover:after:scale-x-100 focus-visible:outline-accent/55 focus-visible:after:scale-x-100 motion-reduce:after:transition-none @max-[768px]:mt-10 @max-[768px]:pt-5"
            routerLink="/articles"
            [queryParams]="{ category: content.projectCategory.key }"
            aria-labelledby="projects-more-title"
            aria-describedby="projects-more-hint"
          >
            <span class="flex min-w-0 flex-col gap-1">
              <span
                id="projects-more-title"
                class="font-display text-[22px]/7 font-semibold tracking-[-0.01em] text-fg @max-[768px]:text-[20px]/6"
                i18n="@@projects.more"
                >Tous les projets</span
              >
              <span
                id="projects-more-hint"
                class="text-[14px]/5 text-fg-muted"
                i18n="@@projects.moreHint"
                >Toutes les études de cas, filtrables par technologie.</span
              >
            </span>
            <span
              class="grid size-10 shrink-0 place-items-center rounded-full border border-border-field text-fg transition-[background-color,border-color,color] duration-(--dur-pop) ease-orbit group-hover/more:border-fill group-hover/more:bg-fill group-hover/more:text-on-fill group-focus-visible/more:border-fill group-focus-visible/more:bg-fill group-focus-visible/more:text-on-fill motion-reduce:transition-none"
              aria-hidden="true"
            >
              <ng-icon
                class="-rotate-45 transition-transform duration-(--dur-roll) ease-orbit group-hover/more:rotate-0 group-focus-visible/more:rotate-0 motion-reduce:transition-none"
                [svg]="arrow"
                size="16"
              />
            </span>
          </a>
        }
      </div>
    </section>
  `,
})
export class ProjectsSectionComponent {
  // #region Properties
  /**
   * Property content
   * @readonly
   *
   * @description
   * Locale-specific project groups supplied by the content view model.
   *
   * @type {SiteContentService}
   */
  protected readonly content: SiteContentService = inject<SiteContentService>(SiteContentService);

  /**
   * Property deco
   * @readonly
   *
   * @description
   * Decorative glyphs placed around the project grid.
   *
   * @type {readonly DecoGlyph[]}
   */
  protected readonly deco: typeof PROJECTS_DECO = PROJECTS_DECO;

  /**
   * Property sectionFx
   * @readonly
   *
   * @description
   * Shared content-section animation classes for the grid wrapper.
   *
   * @type {string}
   */
  protected readonly sectionFx: string = SECTION_FX_CONTENT;

  /** Arrow of the link to every project, drawn north-east at rest and east on hover. */
  protected readonly arrow: string = lucideArrowRight;

  /**
   * Property tint
   * @readonly
   *
   * @description
   * Selects the card tint by display position, falling back to tint 1 if the sequence has no value.
   *
   * @type {(index: number) => ProjectTint}
   */
  protected readonly tint: (index: number) => ProjectTint = (index: number): ProjectTint =>
    PROJECT_CARD_TINTS[index % PROJECT_CARD_TINTS.length] ?? 1;
  // #endregion
}
