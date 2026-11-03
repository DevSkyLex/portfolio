import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SiteContentService } from '@vfortin/content-web-data-access';
import { ProjectCardComponent, type ProjectTint } from '@vfortin/content-web-ui';
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
 * Renders the featured project and remaining project cards with the section transition from the hero.
 */
@Component({
  selector: 'content-projects-section',
  imports: [DecoComponent, ProjectCardComponent, SectionFxDirective, SectionHeadingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="@container relative bg-void pt-40 shadow-[0_-1px_0_var(--void)] before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-[min(640px,70vh)] before:bg-[linear-gradient(to_bottom,transparent_0%,color-mix(in_srgb,var(--void)_6%,transparent)_18%,color-mix(in_srgb,var(--void)_18%,transparent)_34%,color-mix(in_srgb,var(--void)_36%,transparent)_50%,color-mix(in_srgb,var(--void)_58%,transparent)_66%,color-mix(in_srgb,var(--void)_80%,transparent)_82%,color-mix(in_srgb,var(--void)_94%,transparent)_93%,var(--void)_100%)] @max-[768px]:before:h-[360px]"
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
              [link]="['/projects', featured.slug]"
              [featured]="true"
              [tint]="tint(0)"
            />
          }
          @for (project of content.otherProjects(); track project.slug; let i = $index) {
            <content-project-card
              [project]="project"
              [link]="['/projects', project.slug]"
              [tint]="tint(i + 1)"
              [delay]="i * 80"
            />
          }
        </div>
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
