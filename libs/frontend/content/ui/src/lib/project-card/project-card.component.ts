import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ProjectSummary } from '@vfortin/content-web-model';
import { RevealDirective, ScrollProgressDirective } from '@vfortin/ui';
import { TechTagsComponent } from '@internal/content-web-ui/lib/tech/components/tech-tags/tech-tags.component';
import { PROJECT_TINT_CLASSES } from '@internal/content-web-ui/lib/project-card/constants/project-tint-classes.constants';
import type { ProjectTint } from '@internal/content-web-ui/lib/project-card/models/project-tint/project-tint.type';
import { periodYears } from '@internal/content-web-ui/lib/project-card/utils/period-years/period-years.utils';

/**
 * Class ProjectCardComponent
 * @class ProjectCardComponent
 *
 * @description
 * Displays a project as a grid subgrid, with a featured layout when requested by the parent.
 * The parent must establish an `@container` for the responsive layout.
 */
@Component({
  selector: 'content-project-card',
  imports: [RevealDirective, RouterLink, ScrollProgressDirective, TechTagsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-card.component.html',
  host: { class: 'contents' },
})
export class ProjectCardComponent {
  // #region Properties
  /**
   * Property project
   * @readonly
   *
   * @description
   * Project record supplying the card title, period, summary and technology tags.
   *
   * @type {InputSignal<ProjectSummary>}
   */
  public readonly project: InputSignal<ProjectSummary> = input.required<ProjectSummary>();

  /**
   * Property link
   * @readonly
   *
   * @description
   * Router link target used by the card's project anchor.
   *
   * @type {InputSignal<string | readonly unknown[]>}
   */
  public readonly link: InputSignal<string | readonly unknown[]> = input.required<
    string | readonly unknown[]
  >();

  /**
   * Property featured
   * @readonly
   *
   * @description
   * Selects the wide layout with its visual beside the project details.
   *
   * @type {InputSignal<boolean>}
   */
  public readonly featured: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property tint
   * @readonly
   *
   * @description
   * Tint index used to select the project's visual background class.
   *
   * @type {InputSignal<ProjectTint>}
   */
  public readonly tint: InputSignal<ProjectTint> = input<ProjectTint>(1);

  /**
   * Property delay
   * @readonly
   *
   * @description
   * Reveal delay in milliseconds, allowing neighbouring cards to stagger.
   *
   * @type {InputSignal<number>}
   */
  public readonly delay: InputSignal<number> = input<number>(0);

  /**
   * Property tintClass
   * @readonly
   *
   * @description
   * Background class resolved from the selected tint input.
   *
   * @type {Signal<string>}
   */
  protected readonly tintClass: Signal<string> = computed<string>(
    (): string => PROJECT_TINT_CLASSES[this.tint()],
  );

  /**
   * Property years
   * @readonly
   *
   * @description
   * Compact year label derived from the original project period label.
   *
   * @type {Signal<string>}
   */
  protected readonly years: Signal<string> = computed<string>((): string =>
    periodYears(this.project().periodLabel),
  );
  // #endregion
}
