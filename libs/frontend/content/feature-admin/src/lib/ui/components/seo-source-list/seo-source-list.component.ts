import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import type { SeoSourceStatus } from '@internal/content-web-feature-admin/lib/models/seo-source-status/seo-source-status.interface';

/**
 * Component SeoSourceListComponent
 * @class SeoSourceListComponent
 *
 * @description
 * Sources of the dashboard in the side panel (D51): one row per source with the icon of its state,
 * its name and the sentence saying when it was last collected or why it was not. The sentence
 * carries the state, so the icon stays decorative.
 */
@Component({
  selector: 'content-seo-source-list',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <ul class="flex flex-col">
      @for (source of sources(); track source.id) {
        <li
          class="flex items-start gap-2.5 border-b border-border py-2.5 first:pt-0 last:border-b-0 last:pb-0"
        >
          <span class="mt-0.5" [class]="source.status.classes">
            <ng-icon [svg]="source.status.icon" size="14" aria-hidden="true" />
          </span>
          <div class="flex min-w-0 flex-col gap-0.5">
            <span class="text-[13px]/5 font-medium text-fg">{{ source.name }}</span>
            <span class="text-[12px]/4 text-fg-muted">{{ source.detail }}</span>
          </div>
        </li>
      }
    </ul>
  `,
})
export class SeoSourceListComponent {
  // #region Properties
  /**
   * Property sources
   * @readonly
   *
   * @description
   * States of the dashboard's sources, in tab order.
   *
   * @type {InputSignal<readonly SeoSourceStatus[]>}
   */
  public readonly sources: InputSignal<readonly SeoSourceStatus[]> =
    input.required<readonly SeoSourceStatus[]>();
  // #endregion
}
