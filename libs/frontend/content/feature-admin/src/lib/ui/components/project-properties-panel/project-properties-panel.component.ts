import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideCircleCheck, lucideStar, lucideTriangleAlert } from '@ng-icons/lucide';
import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import { BadgeDirective } from '@vfortin/ui';

/**
 * Component ProjectPropertiesPanelComponent
 * @class ProjectPropertiesPanelComponent
 *
 * @description
 * Properties panel beside the project editor (D36): publication status, version, public address,
 * home-page feature and translation completeness, with the D37 status colours.
 */
@Component({
  selector: 'content-project-properties-panel',
  imports: [BadgeDirective, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The host stays out of the editor grid so that the aside itself is the sticky grid column.
  host: { class: 'contents' },
  templateUrl: './project-properties-panel.component.html',
})
export class ProjectPropertiesPanelComponent {
  // #region Properties
  /**
   * Property project
   * @readonly
   *
   * @description
   * Project as last loaded or saved.
   *
   * @type {InputSignal<AdminProject>}
   */
  public readonly project: InputSignal<AdminProject> = input.required<AdminProject>();

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the feature and translation rows.
   */
  protected readonly icons: {
    readonly complete: typeof lucideCircleCheck;
    readonly featured: typeof lucideStar;
    readonly missing: typeof lucideTriangleAlert;
  } = {
    complete: lucideCircleCheck,
    featured: lucideStar,
    missing: lucideTriangleAlert,
  } as const;
  // #endregion
}
