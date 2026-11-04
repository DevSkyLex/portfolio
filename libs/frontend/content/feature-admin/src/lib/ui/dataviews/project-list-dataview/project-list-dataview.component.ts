import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  LOCALE_ID,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  output,
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import {
  lucideCircleCheck,
  lucideEllipsis,
  lucideExternalLink,
  lucideEyeOff,
  lucideFolderKanban,
  lucideGlobe,
  lucidePencil,
  lucideStar,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import {
  BadgeDirective,
  ButtonDirective,
  DATA_TABLE_INITIAL_STATE,
  DataTableCellDirective,
  DataTableEmptyCellComponent,
  DataTableComponent,
  DataTableEmptyDirective,
  DropdownMenuContentDirective,
  DropdownMenuItemDirective,
  DropdownMenuSeparatorDirective,
  DropdownMenuTriggerDirective,
  EMPTY_IMPORTS,
  SelectionBarComponent,
  TooltipDirective,
  type DataTableColumn,
  type DataTableFacet,
  type DataTableLabels,
  type DataTableSearchPredicate,
  type DataTableState,
} from '@vfortin/ui';
import { PROJECT_TABLE_COLUMNS } from '@internal/content-web-feature-admin/lib/constants/project-table-columns.constants';
import { PROJECT_TABLE_FACETS } from '@internal/content-web-feature-admin/lib/constants/project-table-facets.constants';
import { PROJECT_BULK_ACTIONS } from '@internal/content-web-feature-admin/lib/constants/project-bulk-actions.constants';
import type { ProjectBulkAction } from '@internal/content-web-feature-admin/lib/models/project-bulk-action/project-bulk-action.type';
import type { ProjectBulkRequest } from '@internal/content-web-feature-admin/lib/models/project-bulk-action/project-bulk-request.interface';
import { bulkTargets } from '@internal/content-web-feature-admin/lib/utils/project-bulk/project-bulk.utils';
import { missingLabel } from '@internal/content-web-feature-admin/lib/utils/missing-label/missing-label.utils';
import { orderProjects } from '@internal/content-web-feature-admin/lib/utils/order-projects/order-projects.utils';
import { matchesProjectSearch } from '@internal/content-web-feature-admin/lib/utils/project-search/project-search.utils';
import { projectPublicPath } from '@internal/content-web-feature-admin/lib/utils/project-public-path/project-public-path.utils';

/**
 * Component ProjectListDataviewComponent
 * @class ProjectListDataviewComponent
 *
 * @description
 * Project table of the admin (D36, dense hairline rows): title and slug, status (D37 success or
 * neutral), home-page feature (a star under the "Mis en avant" header, named for screen readers),
 * completeness with the readable missing fields in a tooltip, the first technologies, the revision and
 * the "…" menu (edit, public page, publish or unpublish). Search, facets, sort and page live in the
 * bound `state`, which the page mirrors in the URL; the default order is the public one (position, then
 * title). A row click opens the editor through `projectOpened`, the title link is the keyboard way in;
 * the publication requests leave through outputs: the page confirms and writes. Rows carry selection
 * checkboxes; while one is checked, the selection bar offers the bulk actions (each disabled when no
 * selected project is concerned) and `bulkRequested` hands the selection to the page.
 */
@Component({
  selector: 'content-project-list-dataview',
  imports: [
    BadgeDirective,
    ButtonDirective,
    DataTableCellDirective,
    DataTableEmptyCellComponent,
    DataTableComponent,
    DataTableEmptyDirective,
    DropdownMenuContentDirective,
    DropdownMenuItemDirective,
    DropdownMenuSeparatorDirective,
    DropdownMenuTriggerDirective,
    EMPTY_IMPORTS,
    NgIcon,
    RouterLink,
    SelectionBarComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The table and its selection bar join the page's column: the bar's `mt-auto` takes it down.
  host: { class: 'contents' },
  templateUrl: './project-list-dataview.component.html',
})
export class ProjectListDataviewComponent {
  // #region Properties
  /**
   * Property projects
   * @readonly
   *
   * @description
   * Loaded projects, in any order.
   *
   * @type {InputSignal<readonly AdminProject[]>}
   */
  public readonly projects: InputSignal<readonly AdminProject[]> =
    input.required<readonly AdminProject[]>();

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the collection is loading; skeleton rows stand in until the first answer.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly loading: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

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
    { transform: booleanAttribute },
  );

  /**
   * Property state
   * @readonly
   *
   * @description
   * Search, facets, sort, page and columns of the table, bound two-way with the page.
   *
   * @type {ModelSignal<DataTableState>}
   */
  public readonly state: ModelSignal<DataTableState> =
    model<DataTableState>(DATA_TABLE_INITIAL_STATE);

  /**
   * Property selection
   * @readonly
   *
   * @description
   * Selected projects, kept by the table within its search and facets and refreshed after a reload;
   * the page empties it after a bulk action.
   *
   * @type {ModelSignal<readonly AdminProject[]>}
   */
  public readonly selection: ModelSignal<readonly AdminProject[]> = model<readonly AdminProject[]>(
    [],
  );

  /**
   * Property bulkRequested
   * @readonly
   *
   * @description
   * Emits a bulk action chosen in the selection bar, with the whole selection.
   *
   * @type {OutputEmitterRef<ProjectBulkRequest>}
   */
  public readonly bulkRequested: OutputEmitterRef<ProjectBulkRequest> =
    output<ProjectBulkRequest>();

  /**
   * Property projectOpened
   * @readonly
   *
   * @description
   * Emits the project whose row was clicked or validated with Enter.
   *
   * @type {OutputEmitterRef<AdminProject>}
   */
  public readonly projectOpened: OutputEmitterRef<AdminProject> = output<AdminProject>();

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
   * Property rows
   * @readonly
   *
   * @description
   * Projects in the public order, kept while no column is sorted.
   *
   * @type {Signal<AdminProject[]>}
   */
  protected readonly rows: Signal<AdminProject[]> = computed<AdminProject[]>((): AdminProject[] =>
    orderProjects(this.projects()),
  );

  /**
   * Property columns
   * @readonly
   *
   * @description
   * Table columns.
   *
   * @type {readonly DataTableColumn<AdminProject>[]}
   */
  protected readonly columns: readonly DataTableColumn<AdminProject>[] = PROJECT_TABLE_COLUMNS;

  /**
   * Property facets
   * @readonly
   *
   * @description
   * Status, home-page and completeness filters.
   *
   * @type {readonly DataTableFacet<AdminProject>[]}
   */
  protected readonly facets: readonly DataTableFacet<AdminProject>[] = PROJECT_TABLE_FACETS;

  /**
   * Property search
   * @readonly
   *
   * @description
   * Every word in a title, the slug or a technology, accents ignored.
   *
   * @type {DataTableSearchPredicate<AdminProject>}
   */
  protected readonly search: DataTableSearchPredicate<AdminProject> = matchesProjectSearch;

  /**
   * Property pageSizes
   * @readonly
   *
   * @description
   * Page sizes offered in the footer.
   *
   * @type {readonly number[]}
   */
  protected readonly pageSizes: readonly number[] = [20, 50, 100];

  /**
   * Property labels
   * @readonly
   *
   * @description
   * Texts of this table that name projects, over the catalogue's localized defaults (the search
   * placeholder among them).
   *
   * @type {Partial<DataTableLabels>}
   */
  protected readonly labels: Partial<DataTableLabels> = {
    searchLabel: $localize`:@@admin.projects.table.searchLabel:Rechercher un projet`,
    noResults: $localize`:@@admin.projects.table.noResults:Aucun projet trouvé`,
    noResultsHint: $localize`:@@admin.projects.table.noResultsHint:Aucun projet ne correspond à la recherche ou aux filtres.`,
    loading: $localize`:@@admin.projects.table.loading:Chargement des projets…`,
  };

  /**
   * Property bulkActions
   * @readonly
   *
   * @description
   * Buttons of the selection bar, in display order.
   *
   * @type {typeof PROJECT_BULK_ACTIONS}
   */
  protected readonly bulkActions: typeof PROJECT_BULK_ACTIONS = PROJECT_BULK_ACTIONS;

  /**
   * Property selectedCount
   * @readonly
   *
   * @description
   * Count of the selection bar, with a real plural (the `one` message takes the French singular,
   * for 0 and 1; the bar only shows from one selected project).
   *
   * @type {(count: number) => string}
   */
  protected readonly selectedCount: (count: number) => string = (count: number): string =>
    count < 2
      ? $localize`:@@admin.projects.selection.count.one:${count}:count: sélectionné`
      : $localize`:@@admin.projects.selection.count.other:${count}:count: sélectionnés`;

  /**
   * Property clearHint
   * @readonly
   *
   * @description
   * Key cap of the clear button's tooltip, named as the admin's keyboards print it.
   *
   * @type {readonly string[]}
   */
  protected readonly clearHint: readonly string[] = [
    $localize`:@@admin.projects.selection.escapeKey:Échap`,
  ];

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the feature and completeness badges, the empty state and the row menu.
   */
  protected readonly icons: {
    readonly complete: typeof lucideCircleCheck;
    readonly edit: typeof lucidePencil;
    readonly empty: typeof lucideFolderKanban;
    readonly featured: typeof lucideStar;
    readonly missing: typeof lucideTriangleAlert;
    readonly more: typeof lucideEllipsis;
    readonly open: typeof lucideExternalLink;
    readonly publish: typeof lucideGlobe;
    readonly unpublish: typeof lucideEyeOff;
  } = {
    complete: lucideCircleCheck,
    edit: lucidePencil,
    empty: lucideFolderKanban,
    featured: lucideStar,
    missing: lucideTriangleAlert,
    more: lucideEllipsis,
    open: lucideExternalLink,
    publish: lucideGlobe,
    unpublish: lucideEyeOff,
  } as const;

  /**
   * Property host
   * @readonly
   *
   * @description
   * Host element, searched for a row's menu button.
   *
   * @type {HTMLElement}
   */
  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property localeId
   * @readonly
   *
   * @description
   * Locale of the running build, which picks the public page the row menu opens.
   *
   * @type {string}
   */
  private readonly localeId: string = inject<string>(LOCALE_ID);
  // #endregion

  // #region Methods
  /**
   * Method actionsTrigger
   * @method actionsTrigger
   *
   * @description
   * "…" button of a project's row, where a dialog opened from that row's menu returns the focus: the
   * menu item focused at opening no longer exists once the dialog closes.
   *
   * @param {AdminProject} project - Project of the row.
   *
   * @returns {HTMLButtonElement | null} The button, `null` when the row is not rendered.
   */
  public actionsTrigger(project: AdminProject): HTMLButtonElement | null {
    const buttons: HTMLButtonElement[] = Array.from(
      this.host.querySelectorAll<HTMLButtonElement>('button[data-project-actions]'),
    );
    return (
      buttons.find(
        (button: HTMLButtonElement): boolean => button.dataset['projectActions'] === project.id,
      ) ?? null
    );
  }

  /**
   * Method key
   * @method key
   *
   * @description
   * Row identity of a project.
   *
   * @param {AdminProject} project - Row.
   *
   * @returns {string} Project id.
   */
  protected key(project: AdminProject): string {
    return project.id;
  }

  /**
   * Method name
   * @method name
   *
   * @description
   * Name of a project in its selection checkbox label ("Sélectionner Orbite").
   *
   * @param {AdminProject} project - Row.
   *
   * @returns {string} French title.
   */
  protected name(project: AdminProject): string {
    return project.title.fr;
  }

  /**
   * Method eligible
   * @method eligible
   *
   * @description
   * Number of selected projects a bulk action applies to.
   *
   * @param {ProjectBulkAction} action - Bulk action.
   *
   * @returns {number} Eligible count.
   */
  protected eligible(action: ProjectBulkAction): number {
    return bulkTargets(action, this.selection()).length;
  }

  /**
   * Method missingText
   * @method missingText
   *
   * @description
   * Readable list of the fields to complete before publication, for the completeness tooltip.
   *
   * @param {AdminProject} project - Incomplete project.
   *
   * @returns {string} Comma-separated readable labels.
   */
  protected missingText(project: AdminProject): string {
    return project.missing.map(missingLabel).join(', ');
  }

  /**
   * Method actionsLabel
   * @method actionsLabel
   *
   * @description
   * Accessible name of a row's "…" button, naming the project by its French title.
   *
   * @param {AdminProject} project - Project of the row.
   *
   * @returns {string} The name.
   */
  protected actionsLabel(project: AdminProject): string {
    return $localize`:@@admin.projects.row.actionsLabel:Actions pour « ${project.title.fr}:title: »`;
  }

  /**
   * Method publicPath
   * @method publicPath
   *
   * @description
   * Public page of a published project, in the admin's language.
   *
   * @param {AdminProject} project - Project of the row.
   *
   * @returns {string} Root-relative path.
   */
  protected publicPath(project: AdminProject): string {
    return projectPublicPath(project.slug, this.localeId);
  }
  // #endregion
}
