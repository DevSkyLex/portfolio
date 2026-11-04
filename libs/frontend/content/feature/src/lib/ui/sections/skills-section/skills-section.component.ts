import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SiteContentService } from '@vfortin/content-web-data-access';
import { SkillColumnsComponent } from '@vfortin/content-web-ui';
import {
  DecoComponent,
  SECTION_FX_CONTENT,
  SectionFxDirective,
  SectionHeadingComponent,
} from '@vfortin/ui';
import { SKILLS_DECO } from '@internal/content-web-feature/lib/ui/sections/skills-section/constants/skills-deco.constants';

/**
 * Component SkillsSectionComponent
 * @class SkillsSectionComponent
 *
 * @description
 * Supplies locale-specific skill columns and shared visual decoration to the home section.
 */
@Component({
  selector: 'content-skills-section',
  imports: [DecoComponent, SectionFxDirective, SectionHeadingComponent, SkillColumnsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="@container relative bg-surface pt-40 shadow-[0_-1px_0_var(--surface)]"
      id="skills"
      uiSectionFx
      aria-labelledby="skills-title"
    >
      <ui-deco [glyphs]="deco" />
      <div class="relative z-1 wrap" [class]="sectionFx">
        <ui-section-heading headingId="skills-title" i18n="@@section.skills"
          >Compétences</ui-section-heading
        >
        <content-skill-columns [columns]="content.skills()" />
      </div>
    </section>
  `,
})
export class SkillsSectionComponent {
  // #region Properties
  /**
   * Property content
   * @readonly
   *
   * @description
   * Content view model providing skill columns for the active locale.
   *
   * @type {SiteContentService}
   */
  protected readonly content: SiteContentService = inject<SiteContentService>(SiteContentService);

  /**
   * Property deco
   * @readonly
   *
   * @description
   * Decorative glyphs positioned around the skills layout.
   *
   * @type {readonly DecoGlyph[]}
   */
  protected readonly deco: typeof SKILLS_DECO = SKILLS_DECO;

  /**
   * Property sectionFx
   * @readonly
   *
   * @description
   * Shared content-section animation classes for the skills wrapper.
   *
   * @type {string}
   */
  protected readonly sectionFx: string = SECTION_FX_CONTENT;
  // #endregion
}
