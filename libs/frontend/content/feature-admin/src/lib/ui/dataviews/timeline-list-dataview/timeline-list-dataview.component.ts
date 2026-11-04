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
  signal,
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { lucideEllipsis, lucidePencil, lucideTrash2 } from '@ng-icons/lucide';
import type { AdminTimelineEntry, TimelineKind } from '@vfortin/content-web-data-access/admin';
import {
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
  SelectionBarComponent,
  TooltipDirective,
  type DataTableColumn,
  type DataTableFacet,
  DATA_TABLE_INITIAL_STATE,
  type DataTableLabels,
  type DataTableState,
  type DataTableSearchPredicate,
} from '@vfortin/ui';
import { TIMELINE_TABLE_COLUMNS } from '@internal/content-web-feature-admin/lib/constants/timeline-table-columns.constants';
import { TIMELINE_TABLE_WIDTHS_KEYS } from '@internal/content-web-feature-admin/lib/constants/timeline-table-widths-keys.constants';
import type { TimelineKindTexts } from '@internal/content-web-feature-admin/lib/models/timeline-kind-texts/timeline-kind-texts.interface';
import { timelineSelected } from '@internal/content-web-feature-admin/lib/utils/timeline-bulk/timeline-bulk.utils';
import { timelineTableFacets } from '@internal/content-web-feature-admin/lib/utils/timeline-facets/timeline-facets.utils';
import { timelinePeriod } from '@internal/content-web-feature-admin/lib/utils/timeline-period/timeline-period.utils';
import { matchesTimelineSearch } from '@internal/content-web-feature-admin/lib/utils/timeline-search/timeline-search.utils';

/**
 * Component TimelineListDataviewComponent
 * @class TimelineListDataviewComponent
 *
 * @description
 * Table of one timeline kind, most recent first (D36 timeline selection revision: the public
 * timeline places the entries by date, so the list has no manual order): period, title (the row's
 * link), place and technologies, and a row menu « Modifier », « Supprimer ». The toolbar searches and
 * filters by « État », « Lieu » and « Technos » (facets built from the rows, kept in the table's own
 * state). Rows carry selection checkboxes; while one is checked, the selection bar offers
 * « Supprimer ». Without entries, a fill empty state offers the creation. It renders and reports
 * intents only; the page writes.
 */
@Component({
  selector: 'content-timeline-list-dataview',
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
  templateUrl: './timeline-list-dataview.component.html',
})
export class TimelineListDataviewComponent {
  // #region Properties
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Kind listed, which names the stored column widths.
   *
   * @type {InputSignal<TimelineKind>}
   */
  public readonly kind: InputSignal<TimelineKind> = input.required<TimelineKind>();

  /**
   * Property entries
   * @readonly
   *
   * @description
   * Entries of the kind, most recent first.
   *
   * @type {InputSignal<readonly AdminTimelineEntry[]>}
   */
  public readonly entries: InputSignal<readonly AdminTimelineEntry[]> =
    input.required<readonly AdminTimelineEntry[]>();

  /**
   * Property texts
   * @readonly
   *
   * @description
   * Copy of the kind (caption, empty state).
   *
   * @type {InputSignal<TimelineKindTexts>}
   */
  public readonly texts: InputSignal<TimelineKindTexts> = input.required<TimelineKindTexts>();

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the list is loading (skeleton rows).
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
   * Whether a write is running: the deletions wait for it.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly writing: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property returnFocus
   * @readonly
   *
   * @description
   * Where the focus goes when the selection bar closes and the row checkbox it came from is gone
   * (a bulk deletion).
   *
   * @type {InputSignal<HTMLElement | null>}
   */
  public readonly returnFocus: InputSignal<HTMLElement | null> = input<HTMLElement | null>(null);

  /**
   * Property selection
   * @readonly
   *
   * @description
   * Checked entries, kept in their latest loaded version by the table; the page empties it after a
   * bulk action.
   *
   * @type {ModelSignal<readonly AdminTimelineEntry[]>}
   */
  public readonly selection: ModelSignal<readonly AdminTimelineEntry[]> = model<
    readonly AdminTimelineEntry[]
  >([]);

  /**
   * Property deleteManyRequested
   * @readonly
   *
   * @description
   * Emits the whole selection when « Supprimer » is chosen in the selection bar; the page confirms.
   *
   * @type {OutputEmitterRef<readonly AdminTimelineEntry[]>}
   */
  public readonly deleteManyRequested: OutputEmitterRef<readonly AdminTimelineEntry[]> =
    output<readonly AdminTimelineEntry[]>();

  /**
   * Property entryOpened
   * @readonly
   *
   * @description
   * Emits the entry of an activated row.
   *
   * @type {OutputEmitterRef<AdminTimelineEntry>}
   */
  public readonly entryOpened: OutputEmitterRef<AdminTimelineEntry> = output<AdminTimelineEntry>();

  /**
   * Property deleteRequested
   * @readonly
   *
   * @description
   * Emits the entry whose « Supprimer » was chosen; the page confirms.
   *
   * @type {OutputEmitterRef<AdminTimelineEntry>}
   */
  public readonly deleteRequested: OutputEmitterRef<AdminTimelineEntry> =
    output<AdminTimelineEntry>();

  /**
   * Property columns
   * @readonly
   *
   * @description
   * Table columns.
   *
   * @type {readonly DataTableColumn<AdminTimelineEntry>[]}
   */
  protected readonly columns: readonly DataTableColumn<AdminTimelineEntry>[] =
    TIMELINE_TABLE_COLUMNS;

  /**
   * Property facets
   * @readonly
   *
   * @description
   * « État », « Lieu » and « Technos » filters, their place and technology options rebuilt from the
   * rows whenever the list changes.
   *
   * @type {Signal<readonly DataTableFacet<AdminTimelineEntry>[]>}
   */
  protected readonly facets: Signal<readonly DataTableFacet<AdminTimelineEntry>[]> = computed<
    readonly DataTableFacet<AdminTimelineEntry>[]
  >((): readonly DataTableFacet<AdminTimelineEntry>[] =>
    timelineTableFacets(this.entries(), this.locale),
  );

  /**
   * Property labels
   * @readonly
   *
   * @description
   * Table texts in the kind's words; the search placeholder and the loading text keep the catalogue's.
   *
   * @type {Signal<Partial<DataTableLabels>>}
   */
  protected readonly labels: Signal<Partial<DataTableLabels>> = computed<Partial<DataTableLabels>>(
    (): Partial<DataTableLabels> => {
      const { searchLabel, noResults, noResultsHint } = this.texts();
      return { searchLabel, noResults, noResultsHint };
    },
  );

  /**
   * Property widthsKey
   * @readonly
   *
   * @description
   * Storage key of the resized column widths, one per table (experiences, education).
   *
   * @type {Signal<string>}
   */
  protected readonly widthsKey: Signal<string> = computed<string>(
    (): string => TIMELINE_TABLE_WIDTHS_KEYS[this.kind()],
  );

  /**
   * Property clearHint
   * @readonly
   *
   * @description
   * Key that clears the selection, as the selection bar shows it.
   *
   * @type {readonly string[]}
   */
  protected readonly clearHint: readonly string[] = [
    $localize`:@@admin.timeline.selection.escape:Échap`,
  ];

  /**
   * Property search
   * @readonly
   *
   * @description
   * Search over the titles, places and technologies, in both languages.
   *
   * @type {DataTableSearchPredicate<AdminTimelineEntry>}
   */
  protected readonly search: DataTableSearchPredicate<AdminTimelineEntry> = matchesTimelineSearch;

  /**
   * Property pageSizes
   * @readonly
   *
   * @description
   * Page sizes offered in the footer, as in the project table.
   *
   * @type {readonly number[]}
   */
  protected readonly pageSizes: readonly number[] = [20, 50, 100];

  /**
   * Property state
   * @readonly
   *
   * @description
   * Table state starting on the first offered page size (the catalogue default, 10, is not one of
   * them and left the page size select empty).
   *
   * @type {WritableSignal<DataTableState>}
   */
  protected readonly state: WritableSignal<DataTableState> = signal<DataTableState>({
    ...DATA_TABLE_INITIAL_STATE,
    pageSize: 20,
  });

  /**
   * Property selectedCount
   * @readonly
   *
   * @description
   * Count of the selection bar, agreeing in French with both feminine nouns (« 1 sélectionnée »).
   *
   * @type {(count: number) => string}
   */
  protected readonly selectedCount: (count: number) => string = (count: number): string =>
    timelineSelected(count, this.locale);

  /**
   * Property period
   * @readonly
   *
   * @description
   * Period label of a row.
   *
   * @type {typeof timelinePeriod}
   */
  protected readonly period: typeof timelinePeriod = timelinePeriod;

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the rows and the selection bar, already used elsewhere in the admin.
   */
  protected readonly icons: {
    readonly edit: typeof lucidePencil;
    readonly more: typeof lucideEllipsis;
    readonly remove: typeof lucideTrash2;
  } = {
    edit: lucidePencil,
    more: lucideEllipsis,
    remove: lucideTrash2,
  } as const;

  /**
   * Property host
   * @readonly
   *
   * @description
   * Host element, searched for a row's controls.
   *
   * @type {HTMLElement}
   */
  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Build locale: plural rules of the counts, collation of the facet options.
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);
  // #endregion

  // #region Methods
  /**
   * Method actionsTrigger
   * @method actionsTrigger
   *
   * @description
   * "…" button of an entry's row, where a dialog opened from its menu returns the focus.
   *
   * @param {AdminTimelineEntry} entry - Entry of the row.
   *
   * @returns {HTMLButtonElement | null} The button, `null` when the row is not rendered.
   */
  public actionsTrigger(entry: AdminTimelineEntry): HTMLButtonElement | null {
    return this.control<HTMLButtonElement>('button[data-entry-actions]', 'entryActions', entry);
  }

  /**
   * Method actionsLabel
   * @method actionsLabel
   *
   * @description
   * Accessible name of a row's "…" button.
   *
   * @param {AdminTimelineEntry} entry - Entry of the row.
   *
   * @returns {string} Label naming the entry by its French title.
   */
  protected actionsLabel(entry: AdminTimelineEntry): string {
    return $localize`:@@admin.timeline.row.actions:Actions pour « ${entry.title.fr}:title: »`;
  }

  /**
   * Method key
   * @method key
   *
   * @description
   * Row identity.
   *
   * @param {AdminTimelineEntry} entry - Entry.
   *
   * @returns {string} Identifier.
   */
  protected key(entry: AdminTimelineEntry): string {
    return entry.id;
  }

  /**
   * Method name
   * @method name
   *
   * @description
   * Accessible name of a row.
   *
   * @param {AdminTimelineEntry} entry - Entry.
   *
   * @returns {string} French title.
   */
  protected name(entry: AdminTimelineEntry): string {
    return entry.title.fr;
  }

  /**
   * Method control
   * @method control
   *
   * @description
   * Finds the element of a row carrying the entry identifier in a data attribute.
   *
   * @param {string} selector - Element selector.
   * @param {string} attribute - Dataset key holding the identifier.
   * @param {AdminTimelineEntry} entry - Entry of the row.
   *
   * @returns {T | null} Element, or `null`.
   */
  private control<T extends HTMLElement>(
    selector: string,
    attribute: string,
    entry: AdminTimelineEntry,
  ): T | null {
    return (
      Array.from(this.host.querySelectorAll<T>(selector)).find(
        (element: T): boolean => element.dataset[attribute] === entry.id,
      ) ?? null
    );
  }
  // #endregion
}
