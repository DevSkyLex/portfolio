import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  type InputSignal,
  type ModelSignal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import {
  InputGroupAddonDirective,
  InputGroupDirective,
  InputGroupInputDirective,
  ToggleGroupDirective,
  ToggleGroupItemDirective,
} from '@vfortin/ui';
import { lucideSearch } from '@ng-icons/lucide';
import type { ProjectView } from '@internal/content-web-feature-admin/lib/models/project-view/project-view.type';
import { PROJECT_VIEW_OPTIONS } from '@internal/content-web-feature-admin/lib/options/project-view-options.constants';

/**
 * Component ProjectListToolbarComponent
 * @class ProjectListToolbarComponent
 *
 * @description
 * 48 px title bar of the project list (D36): page title, project count, search field and status filter.
 */
@Component({
  selector: 'content-project-list-toolbar',
  imports: [
    InputGroupAddonDirective,
    InputGroupDirective,
    InputGroupInputDirective,
    NgIcon,
    ToggleGroupDirective,
    ToggleGroupItemDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The host stays out of the layout so that the header itself sticks to the top of the page.
  host: { class: 'contents' },
  template: `
    <header
      class="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-3 border-b border-line bg-void px-6 @max-[640px]:px-4"
    >
      <h1 class="text-[14px] font-semibold text-star">Projets</h1>
      <span class="text-[13px] text-star-faint">{{ count() }}</span>
      <div uiInputGroup size="sm" class="ml-auto h-7 w-56 rounded-[8px] @max-[640px]:w-36">
        <div uiInputGroupAddon>
          <ng-icon [svg]="icons.search" size="14" aria-hidden="true" />
        </div>
        <input
          uiInputGroupInput
          class="text-[13px]"
          type="search"
          placeholder="Rechercher…"
          aria-label="Rechercher un projet"
          [value]="query()"
          (input)="search($event)"
        />
      </div>
      <div
        uiToggleGroup
        required
        class="gap-px rounded-[8px] border border-line-field p-0.5"
        aria-label="Filtrer par statut"
        [(value)]="view"
      >
        @for (option of views; track option.value) {
          <button
            uiToggleGroupItem
            class="h-6 min-w-0 rounded-[6px] px-2.5 text-[12px] font-medium"
            [value]="option.value"
          >
            {{ option.label }}
          </button>
        }
      </div>
    </header>
  `,
})
export class ProjectListToolbarComponent {
  // #region Properties
  /**
   * Property count
   * @readonly
   *
   * @description
   * Number of loaded projects, whatever the search and filter.
   *
   * @type {InputSignal<number>}
   */
  public readonly count: InputSignal<number> = input.required<number>();

  /**
   * Property query
   * @readonly
   *
   * @description
   * Search typed in the title bar, bound two-way with the page.
   *
   * @type {ModelSignal<string>}
   */
  public readonly query: ModelSignal<string> = model<string>('');

  /**
   * Property view
   * @readonly
   *
   * @description
   * Status filter in use, bound two-way with the page.
   *
   * @type {ModelSignal<ProjectView>}
   */
  public readonly view: ModelSignal<ProjectView> = model<ProjectView>('all');

  /**
   * Property views
   * @readonly
   *
   * @description
   * Status filters, in display order.
   */
  protected readonly views: typeof PROJECT_VIEW_OPTIONS = PROJECT_VIEW_OPTIONS;

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icon of the search field.
   */
  protected readonly icons: { readonly search: typeof lucideSearch } = {
    search: lucideSearch,
  } as const;
  // #endregion

  // #region Methods
  /**
   * Method search
   * @method search
   *
   * @description
   * Keeps the search query in step with the field.
   *
   * @param {Event} event - Input event of the search field.
   */
  protected search(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
  // #endregion
}
