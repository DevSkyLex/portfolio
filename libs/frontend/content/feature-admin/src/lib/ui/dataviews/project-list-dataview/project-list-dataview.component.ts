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
  lucideEllipsis,
  lucideExternalLink,
  lucideEyeOff,
  lucideGlobe,
  lucidePencil,
  lucideStar,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import {
  BadgeDirective,
  ButtonDirective,
  DropdownMenuContentDirective,
  DropdownMenuItemDirective,
  DropdownMenuSeparatorDirective,
  DropdownMenuTriggerDirective,
  TooltipDirective,
} from '@vfortin/ui';
import type { ProjectGroup } from '@internal/content-web-feature-admin/lib/models/project-group/project-group.interface';

/**
 * Component ProjectListDataviewComponent
 * @class ProjectListDataviewComponent
 *
 * @description
 * Hairline project rows grouped by status (D36), with the D37 status colours: published in success,
 * drafts neutral, missing translations in warning, the home-page feature in info. The title opens the
 * editor; the row's "…" menu edits, opens the public page of a published project and requests its
 * publication or unpublication, which leaves through outputs: the page confirms and writes.
 */
@Component({
  selector: 'content-project-list-dataview',
  imports: [
    BadgeDirective,
    ButtonDirective,
    DropdownMenuContentDirective,
    DropdownMenuItemDirective,
    DropdownMenuSeparatorDirective,
    DropdownMenuTriggerDirective,
    NgIcon,
    RouterLink,
    TooltipDirective,
  ],
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
   * Whether a publication write is running; the menus' publication items are disabled meanwhile.
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
   * Emits the project whose "Publier" menu item was chosen (complete drafts only).
   *
   * @type {OutputEmitterRef<AdminProject>}
   */
  public readonly publishRequested: OutputEmitterRef<AdminProject> = output<AdminProject>();

  /**
   * Property unpublishRequested
   * @readonly
   *
   * @description
   * Emits the project whose "Dépublier" menu item was chosen, before any confirmation.
   *
   * @type {OutputEmitterRef<AdminProject>}
   */
  public readonly unpublishRequested: OutputEmitterRef<AdminProject> = output<AdminProject>();

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the status, feature and completeness marks and of the row menu.
   */
  protected readonly icons: {
    readonly complete: typeof lucideCircleCheck;
    readonly draft: typeof lucideCircleDashed;
    readonly edit: typeof lucidePencil;
    readonly featured: typeof lucideStar;
    readonly missing: typeof lucideTriangleAlert;
    readonly more: typeof lucideEllipsis;
    readonly open: typeof lucideExternalLink;
    readonly publish: typeof lucideGlobe;
    readonly published: typeof lucideCircleCheckBig;
    readonly unpublish: typeof lucideEyeOff;
  } = {
    complete: lucideCircleCheck,
    draft: lucideCircleDashed,
    edit: lucidePencil,
    featured: lucideStar,
    missing: lucideTriangleAlert,
    more: lucideEllipsis,
    open: lucideExternalLink,
    publish: lucideGlobe,
    published: lucideCircleCheckBig,
    unpublish: lucideEyeOff,
  } as const;
  // #endregion
}
