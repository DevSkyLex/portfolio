import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
  input,
  type InputSignal,
  type Signal,
  type TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { lucideCircleCheck, lucideTriangleAlert } from '@ng-icons/lucide';
import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import { BadgeDirective } from '@vfortin/ui';
import { missingLabel } from '@internal/content-web-feature-admin/lib/utils/missing-label/missing-label.utils';
import { projectPublicPath } from '@internal/content-web-feature-admin/lib/utils/project-public-path/project-public-path.utils';

/**
 * Component ProjectPropertiesPanelComponent
 * @class ProjectPropertiesPanelComponent
 *
 * @description
 * Properties of the edited project (D36): publication status, version, public address and
 * completeness with readable field names, with the D37 status colours, then the shared settings the
 * project form hands over as a template (cover, site, technologies, home-page feature), still bound to
 * that form. The page shows it in the column beside the editor on wide screens and in a right sheet
 * below 1180 px. Status and completeness use the list's terms ("Publié" / "Brouillon", "Complet" /
 * "N à compléter") and the address, the public page in the admin's language, wraps. Every row,
 * settings included, keeps one 88 px label column, from the 280 px of the sheet and the narrowest
 * panel to the widest panel.
 */
@Component({
  selector: 'content-project-properties-panel',
  imports: [BadgeDirective, NgIcon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  templateUrl: './project-properties-panel.component.html',
})
export class ProjectPropertiesPanelComponent {
  // #region Properties
  /**
   * Property project
   * @readonly
   *
   * @description
   * Project as last loaded or saved; `null` while it is being created, which shows the settings only.
   *
   * @type {InputSignal<AdminProject | null>}
   */
  public readonly project: InputSignal<AdminProject | null> = input.required<AdminProject | null>();

  /**
   * Property settings
   * @readonly
   *
   * @description
   * Shared settings of the project form, rendered under the properties; `null` before the form exists
   * or where another panel already shows them, so that their fields render once.
   *
   * @type {InputSignal<TemplateRef<unknown> | null>}
   */
  public readonly settings: InputSignal<TemplateRef<unknown> | null> =
    input<TemplateRef<unknown> | null>(null);

  /**
   * Property missing
   * @readonly
   *
   * @description
   * Readable names of the fields to complete before publication.
   *
   * @type {Signal<string[]>}
   */
  protected readonly missing: Signal<string[]> = computed<string[]>((): string[] =>
    (this.project()?.missing ?? []).map(missingLabel),
  );

  /**
   * Property localeId
   * @readonly
   *
   * @description
   * Locale of the running build, which picks the public page of the address.
   *
   * @type {string}
   */
  private readonly localeId: string = inject<string>(LOCALE_ID);

  /**
   * Property path
   * @readonly
   *
   * @description
   * Public address of the project (`/fr/projects/<slug>` or `/en/projects/<slug>`).
   *
   * @type {Signal<string>}
   */
  protected readonly path: Signal<string> = computed<string>((): string => {
    const project: AdminProject | null = this.project();
    return project ? projectPublicPath(project.slug, this.localeId) : '';
  });

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the completeness row.
   */
  protected readonly icons: {
    readonly complete: typeof lucideCircleCheck;
    readonly missing: typeof lucideTriangleAlert;
  } = {
    complete: lucideCircleCheck,
    missing: lucideTriangleAlert,
  } as const;
  // #endregion
}
