import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  input,
  output,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import {
  lucideCircleCheck,
  lucideCircleCheckBig,
  lucideCircleDashed,
  lucideStar,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import { BadgeDirective, ButtonDirective } from '@vfortin/ui';
import type { ProjectGroup } from '@internal/content-web-feature-admin/lib/models/project-group/project-group.interface';

/**
 * Component ProjectListDataviewComponent
 * @class ProjectListDataviewComponent
 *
 * @description
 * Hairline project rows grouped by status (D36), with the D37 status colours: published in success,
 * drafts neutral, missing translations in warning, the home-page feature in info. Publication requests
 * leave through outputs; the page confirms and writes.
 */
@Component({
  selector: 'content-project-list-dataview',
  imports: [BadgeDirective, ButtonDirective, NgIcon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-list-dataview.component.html',
})
export class ProjectListDataviewComponent {
  // #region Properties
  /**
   * Property groups
   * @readonly
   *
   * @description
   * Non-empty status groups, in display order.
   *
   * @type {InputSignal<readonly ProjectGroup[]>}
   */
  public readonly groups: InputSignal<readonly ProjectGroup[]> =
    input.required<readonly ProjectGroup[]>();

  /**
   * Property writing
   * @readonly
   *
   * @description
   * Whether a publication write is running; the row buttons are disabled meanwhile.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly writing: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    {
      transform: booleanAttribute,
    },
  );

  /**
   * Property publishRequested
   * @readonly
   *
   * @description
   * Emits the project whose "Publier" button was pressed (complete drafts only).
   *
   * @type {OutputEmitterRef<AdminProject>}
   */
  public readonly publishRequested: OutputEmitterRef<AdminProject> = output<AdminProject>();

  /**
   * Property unpublishRequested
   * @readonly
   *
   * @description
   * Emits the project whose "Dépublier" button was pressed, before any confirmation.
   *
   * @type {OutputEmitterRef<AdminProject>}
   */
  public readonly unpublishRequested: OutputEmitterRef<AdminProject> = output<AdminProject>();

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the status, feature and completeness marks.
   */
  protected readonly icons: {
    readonly complete: typeof lucideCircleCheck;
    readonly draft: typeof lucideCircleDashed;
    readonly featured: typeof lucideStar;
    readonly missing: typeof lucideTriangleAlert;
    readonly published: typeof lucideCircleCheckBig;
  } = {
    complete: lucideCircleCheck,
    draft: lucideCircleDashed,
    featured: lucideStar,
    missing: lucideTriangleAlert,
    published: lucideCircleCheckBig,
  } as const;
  // #endregion
}
