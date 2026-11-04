import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideChevronRight } from '@ng-icons/lucide';
import {
  ButtonDirective,
  CollapsibleContentComponent,
  CollapsibleDirective,
  CollapsibleTriggerDirective,
} from '@vfortin/ui';
import type { ContentLocale } from '@internal/content-web-feature-admin/lib/models/content-locale/content-locale.type';
import type { SeoGeneratedTag } from '@internal/content-web-feature-admin/lib/models/seo-generated-tag/seo-generated-tag.interface';

/**
 * Component SeoGeneratedTagsComponent
 * @class SeoGeneratedTagsComponent
 *
 * @description
 * Read-only « Balises générées » disclosure of the project editor: every head element the public page
 * will emit for one language (D42), closed by default. Names and values are mono 12 px; a long value
 * is cut on one line and its full text is the row's `title`.
 */
@Component({
  selector: 'content-seo-generated-tags',
  imports: [
    ButtonDirective,
    CollapsibleContentComponent,
    CollapsibleDirective,
    CollapsibleTriggerDirective,
    NgIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div uiCollapsible class="flex flex-col gap-2" data-slot="seo-generated-tags">
      <button
        uiBtn
        uiCollapsibleTrigger
        variant="ghost"
        size="xs"
        class="group -ml-2 w-fit gap-1.5 text-[13px] text-fg-muted hover:text-fg"
      >
        <ng-icon
          class="transition-transform duration-(--dur-pop) ease-orbit group-data-[state=open]:rotate-90 motion-reduce:transition-none"
          [svg]="icons.chevron"
          size="14"
          aria-hidden="true"
        />
        <ng-container i18n="@@admin.project.seo.generatedTags"
          >Balises générées
          <span class="font-mono text-[12px] font-normal text-fg-faint">{{
            tags().length
          }}</span></ng-container
        >
      </button>
      <ui-collapsible-content>
        <dl
          class="flex flex-col rounded-xl border border-border bg-surface-raised py-2"
          [attr.lang]="language()"
        >
          @for (tag of tags(); track tag.name) {
            <div
              class="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-baseline gap-x-3 px-4 py-0.5"
              data-slot="seo-generated-tag"
            >
              <dt class="truncate font-mono text-[12px]/5 text-fg-faint" lang="en">
                {{ tag.name }}
              </dt>
              <dd class="truncate font-mono text-[12px]/5 text-fg" [title]="tag.full">
                {{ tag.value }}
              </dd>
            </div>
          }
        </dl>
      </ui-collapsible-content>
    </div>
  `,
})
export class SeoGeneratedTagsComponent {
  // #region Properties
  /**
   * Property tags
   * @readonly
   *
   * @description
   * Rows to list, in document order.
   *
   * @type {InputSignal<readonly SeoGeneratedTag[]>}
   */
  public readonly tags: InputSignal<readonly SeoGeneratedTag[]> =
    input.required<readonly SeoGeneratedTag[]>();

  /**
   * Property language
   * @readonly
   *
   * @description
   * Language of the page the tags belong to, set on the values.
   *
   * @type {InputSignal<ContentLocale>}
   */
  public readonly language: InputSignal<ContentLocale> = input<ContentLocale>('fr');

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Chevron of the disclosure trigger, turned a quarter while open.
   */
  protected readonly icons: { readonly chevron: typeof lucideChevronRight } = {
    chevron: lucideChevronRight,
  } as const;
  // #endregion
}
