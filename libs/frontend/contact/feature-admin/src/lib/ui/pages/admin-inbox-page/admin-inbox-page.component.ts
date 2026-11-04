import type { InboxFilter } from '@internal/contact-web-feature-admin/lib/models/inbox-filter/inbox-filter.interface';

import { DOCUMENT } from '@angular/common';
import {
  type Signal,
  type TemplateRef,
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  LOCALE_ID,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, type ParamMap } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { lucideCircleAlert, lucideX } from '@ng-icons/lucide';
import {
  type AdminMessage,
  AdminInboxStore,
  type AdminInboxStoreType,
  type StoreError,
} from '@vfortin/contact-web-data-access';
import {
  type DialogRef,
  type PanelSize,
  AlertDirective,
  ButtonDirective,
  ConfirmDialogService,
  CountBadgeComponent,
  EMPTY_IMPORTS,
  PAGE_HEADER_IMPORTS,
  ResizableHandleComponent,
  ResizableLayoutService,
  ResizablePanelDirective,
  ResizablePanelGroupDirective,
  SheetCloseDirective,
  SheetService,
  SheetTitleDirective,
  SidebarTriggerComponent,
  SkeletonDirective,
  TabsContentDirective,
  TabsDirective,
  TabsListDirective,
  TabsTriggerDirective,
  ToastService,
  TooltipDirective,
} from '@vfortin/ui';
import { INBOX_FILTERS } from '@internal/contact-web-feature-admin/lib/constants/inbox-filters.constants';
import {
  INBOX_NARROW_QUERY,
  INBOX_PANES_LAYOUT,
} from '@internal/contact-web-feature-admin/lib/constants/inbox-layout.constants';
import { INBOX_READ_DELAY_MS } from '@internal/contact-web-feature-admin/lib/constants/inbox-read.constants';
import { INBOX_CONFLICT_MESSAGE } from '@internal/contact-web-feature-admin/lib/constants/inbox-toasts.constants';
import type { InboxFilterKey } from '@internal/contact-web-feature-admin/lib/models/inbox-filter/inbox-filter-key.type';
import { MessageDetailComponent } from '@internal/contact-web-feature-admin/lib/ui/components/message-detail/message-detail.component';
import { MessageListDataviewComponent } from '@internal/contact-web-feature-admin/lib/ui/dataviews/message-list-dataview/message-list-dataview.component';
import {
  inboxFilterOf,
  inboxFilterQuery,
} from '@internal/contact-web-feature-admin/lib/utils/inbox-filter-query/inbox-filter-query.utils';

/**
 * Component AdminInboxPageComponent
 * @class AdminInboxPageComponent
 *
 * @description
 * Administrator inbox (D36): owns the inbox store, the status filter (kept in the `status` query
 * parameter), the open message, marking it read once shown, the mail-client shortcuts, the deletion
 * confirmation and the outcome toasts; the list and the reading pane only render. Wide screens show two panes split by a separator
 * whose position is remembered per viewer; below 1024 px the list fills the page and a message opens
 * in a right sheet.
 */
@Component({
  selector: 'contact-admin-inbox-page',
  imports: [
    AlertDirective,
    ButtonDirective,
    CountBadgeComponent,
    EMPTY_IMPORTS,
    MessageDetailComponent,
    MessageListDataviewComponent,
    NgIcon,
    PAGE_HEADER_IMPORTS,
    ResizableHandleComponent,
    ResizablePanelDirective,
    ResizablePanelGroupDirective,
    SheetCloseDirective,
    SheetTitleDirective,
    SidebarTriggerComponent,
    SkeletonDirective,
    TabsContentDirective,
    TabsDirective,
    TabsListDirective,
    TabsTriggerDirective,
    TooltipDirective,
  ],
  templateUrl: './admin-inbox-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AdminInboxStore],
  host: {
    class: 'flex min-h-dvh flex-col @min-[1024px]:h-dvh',
    '(window:keydown)': 'shortcut($event)',
  },
})
export class AdminInboxPageComponent {
  // #region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped inbox store that owns the active filter, loaded messages, and mutation state.
   *
   * @type {AdminInboxStoreType}
   */
  protected readonly store: AdminInboxStoreType = inject<AdminInboxStoreType>(AdminInboxStore);

  /**
   * Property host
   * @readonly
   *
   * @description
   * Page element, used to move the focus to the row picked with the keyboard.
   *
   * @type {ElementRef<HTMLElement>}
   */
  private readonly host: ElementRef<HTMLElement> = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Property document
   * @readonly
   *
   * @description
   * Document whose window answers the narrow layout query.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property route
   * @readonly
   *
   * @description
   * Inbox route whose query parameters hold the selected filter tab.
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Writes the selected filter tab to the URL.
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property confirmDialog
   * @readonly
   *
   * @description
   * Asks for confirmation before a deletion.
   *
   * @type {ConfirmDialogService}
   */
  private readonly confirmDialog: ConfirmDialogService =
    inject<ConfirmDialogService>(ConfirmDialogService);

  /**
   * Property toasts
   * @readonly
   *
   * @description
   * Reports the outcome of each status change or deletion in the layout's toaster.
   *
   * @type {ToastService}
   */
  private readonly toasts: ToastService = inject<ToastService>(ToastService);

  /**
   * Property sheets
   * @readonly
   *
   * @description
   * Opens the reading sheet on narrow screens.
   *
   * @type {SheetService}
   */
  private readonly sheets: SheetService = inject<SheetService>(SheetService);

  /**
   * Property reading
   * @readonly
   *
   * @description
   * Content of the reading sheet: the open message with its title bar.
   */
  private readonly reading: Signal<TemplateRef<unknown>> =
    viewChild.required<TemplateRef<unknown>>('reading');

  /**
   * Property sheet
   * @readonly
   *
   * @description
   * Open reading sheet, `null` while it is closed; picking another row never stacks a second one, and
   * a row is marked current on narrow screens only while it is open.
   *
   * @type {WritableSignal<DialogRef<unknown> | null>}
   */
  private readonly sheet: WritableSignal<DialogRef<unknown> | null> =
    signal<DialogRef<unknown> | null>(null);

  /**
   * Property narrow
   * @readonly
   *
   * @description
   * Whether the page is below the two-pane breakpoint; `false` where `matchMedia` is unavailable.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly narrow: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property layouts
   * @readonly
   *
   * @description
   * Per-viewer storage of the split between the list and the reading pane.
   *
   * @type {ResizableLayoutService}
   */
  private readonly layouts: ResizableLayoutService =
    inject<ResizableLayoutService>(ResizableLayoutService);

  /**
   * Property panesLayout
   * @readonly
   *
   * @description
   * Default split, bounds and storage key of the two panes.
   */
  protected readonly panesLayout: typeof INBOX_PANES_LAYOUT = INBOX_PANES_LAYOUT;

  /**
   * Property listWidth
   * @readonly
   *
   * @description
   * Last message list width in pixels, read from storage before the first render so the list starts
   * at its remembered width (380 px by default, or after a percentage layout stored before), and kept
   * in step with each save so panes created again (after an empty filter) reuse it.
   *
   * @type {WritableSignal<number>}
   */
  protected readonly listWidth: WritableSignal<number> = signal<number>(
    this.layouts.readPixels(INBOX_PANES_LAYOUT),
  );

  /**
   * Property listDefault
   * @readonly
   *
   * @description
   * Message list width bound to its pane, as a pixel size; the reading pane takes the rest.
   *
   * @type {Signal<PanelSize>}
   */
  protected readonly listDefault: Signal<PanelSize> = computed<PanelSize>(
    (): PanelSize => `${this.listWidth()}px` as const,
  );

  /**
   * Property selectedId
   * @readonly
   *
   * @description
   * Message opened in the reading pane; `null` until the administrator picks one.
   *
   * @type {WritableSignal<string | null>}
   */
  private readonly selectedId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property selected
   * @readonly
   *
   * @description
   * Message shown in the reading pane: the picked one while it is still listed, otherwise the first of
   * the page, so a filter change, a status change or a deletion never leaves the pane empty.
   */
  protected readonly selected: Signal<AdminMessage | undefined> = computed<
    AdminMessage | undefined
  >(() => {
    const messages: readonly AdminMessage[] = this.store.messages();
    return messages.find((m) => m.id === this.selectedId()) ?? messages[0];
  });

  /**
   * Property shown
   * @readonly
   *
   * @description
   * Message on screen: the one of the reading pane, or on narrow screens the one of the open sheet
   * only, since no message shows while the sheet is closed.
   */
  private readonly shown: Signal<AdminMessage | undefined> = computed<AdminMessage | undefined>(
    () => (this.narrow() && !this.sheet() ? undefined : this.selected()),
  );

  /**
   * Property currentId
   * @readonly
   *
   * @description
   * Row marked current in the list (`aria-current`, accent bar): the message on screen.
   */
  protected readonly currentId: Signal<string | null> = computed<string | null>(
    () => this.shown()?.id ?? null,
  );

  /**
   * Property unreadShownId
   * @readonly
   *
   * @description
   * Message on screen while it is still received, `null` otherwise; a string, so a reload that
   * returns the same message does not restart its reading delay.
   */
  private readonly unreadShownId: Signal<string | null> = computed<string | null>(() => {
    const message: AdminMessage | undefined = this.shown();
    return message?.status === 'received' ? message.id : null;
  });

  /**
   * Property readAttempts
   * @readonly
   *
   * @description
   * Messages already marked read automatically, or tried: each is sent once per page visit, so a
   * failed or refused read never repeats in a loop.
   *
   * @type {Set<string>}
   */
  private readonly readAttempts: Set<string> = new Set<string>();

  /**
   * Property filterKey
   * @readonly
   *
   * @description
   * Selected status filter tab; the store's `null` status is the "Tous" filter.
   *
   * @type {Signal<InboxFilterKey>}
   */
  protected readonly filterKey: Signal<InboxFilterKey> = computed<InboxFilterKey>(
    () => this.store.status() ?? 'all',
  );

  /**
   * Property filters
   * @readonly
   *
   * @description
   * Status filters of the page header tabs.
   *
   * @type {typeof INBOX_FILTERS}
   */
  protected readonly filters: typeof INBOX_FILTERS = INBOX_FILTERS;

  /**
   * Property filter
   * @readonly
   *
   * @description
   * Selected status filter: its empty-state title ("Aucun message non lu", …) and its list name. The
   * store status always names one; the first ("Tous") stands in otherwise, as for an unknown URL.
   *
   * @type {Signal<InboxFilter>}
   */
  protected readonly filter: Signal<InboxFilter> = computed<InboxFilter>(
    () =>
      this.filters.find((filter) => filter.key === this.filterKey()) ??
      (INBOX_FILTERS[0] as InboxFilter),
  );

  /**
   * Property total
   * @readonly
   *
   * @description
   * Messages of every status beside the heading, whatever the tab, as the project list counts every
   * project; `null` (no figure) until known, never a false zero.
   *
   * @type {Signal<number | null>}
   */
  protected readonly total: Signal<number | null> = computed<number | null>(() =>
    this.store.allTotal(),
  );

  /**
   * Property unreadCount
   * @readonly
   *
   * @description
   * Count on the "Non lus" tab: the list total once the unread list has loaded, which is the freshest
   * figure, less the rows read since then and still kept on screen; otherwise the owner's unread
   * summary shared with the sidebar (`null` while unknown).
   *
   * @type {Signal<number | null>}
   */
  protected readonly unreadCount: Signal<number | null> = computed<number | null>(() =>
    this.store.status() === 'received' && this.store.loadCallState().status === 'success'
      ? this.store.total() - this.store.outdated()
      : this.store.unread(),
  );

  /**
   * Property plurals
   * @readonly
   *
   * @description
   * Plural rules of the build locale, which choose the unit after the heading count: French takes the
   * singular for zero and one message, English for one only.
   *
   * @type {Intl.PluralRules}
   */
  private readonly plurals: Intl.PluralRules = new Intl.PluralRules(inject<string>(LOCALE_ID));

  /**
   * Property totalLabel
   * @readonly
   *
   * @description
   * Spoken unit after the message count of the heading, in the plural form of the build locale.
   *
   * @type {Signal<string>}
   */
  protected readonly totalLabel: Signal<string> = computed<string>(() =>
    this.plurals.select(this.total() ?? 0) === 'one'
      ? $localize`:@@admin.inbox.total.one:message`
      : $localize`:@@admin.inbox.total.other:messages`,
  );

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the load failure notice and the sheet's close button; the empty state takes the
   * icon of its filter.
   */
  protected readonly icons: {
    readonly close: typeof lucideX;
    readonly error: typeof lucideCircleAlert;
  } = {
    close: lucideX,
    error: lucideCircleAlert,
  } as const;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Starts the initial inbox request on the filter tab named by the URL, follows the query parameters
   * (Back, Forward, the sidebar link) and the two-pane breakpoint, and marks a received message read
   * once it has stayed on screen for `INBOX_READ_DELAY_MS`.
   */
  public constructor() {
    void this.store.filter(inboxFilterOf(this.route.snapshot.queryParamMap).status);
    // The first emission repeats the snapshot, and the URL written by `applyFilter` comes back here:
    // both name the tab already loaded and are ignored.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params: ParamMap): void => {
      const filter: InboxFilter = inboxFilterOf(params);
      if (filter.key !== this.filterKey()) void this.store.filter(filter.status);
    });
    this.watchWidth(inject<DestroyRef>(DestroyRef));
    effect((onCleanup: (cleanup: () => void) => void): void => {
      const id: string | null = this.unreadShownId();
      // While a write runs the delay waits for it: the effect runs again once it settles.
      if (id === null || this.readAttempts.has(id) || this.store.writing()) return;
      const timer: ReturnType<typeof setTimeout> = setTimeout(
        () => void this.autoRead(id),
        INBOX_READ_DELAY_MS,
      );
      onCleanup(() => clearTimeout(timer));
    });
  }
  // #endregion

  // #region Methods
  /**
   * Method applyFilter
   * @method applyFilter
   *
   * @description
   * Loads the filter tab chosen in the page header (Enter or Space, since the tabs activate manually)
   * and writes it to the URL in place of the current history entry, as the project list does; a tab
   * set always keeps one tab selected.
   *
   * @param {unknown} key - New tab value.
   */
  protected applyFilter(key: unknown): void {
    const filter: InboxFilter | undefined = this.filters.find((candidate) => candidate.key === key);
    if (filter && filter.key !== this.filterKey()) {
      void this.store.filter(filter.status);
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: inboxFilterQuery(filter.key),
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  /**
   * Method select
   * @method select
   *
   * @description
   * Opens a message in the reading pane, or in the reading sheet on narrow screens.
   *
   * @param {AdminMessage} message - Message picked in the list.
   */
  protected select(message: AdminMessage): void {
    this.open(message.id);
    if (this.narrow() && !this.sheet()) {
      const sheet: DialogRef<unknown, unknown> = this.sheets.open(this.reading(), {
        side: 'right',
        // A stable name: J and K change the message, and so the visible title, inside the open sheet.
        ariaLabel: $localize`:@@admin.inbox.sheet.label:Lecture du message`,
        showClose: false,
        // The title takes the focus: the close button would open its tooltip on arrival.
        autoFocus: 'first-heading',
        class: 'max-w-[640px] gap-0 p-0',
      });
      this.sheet.set(sheet);
      sheet.closed.subscribe(() => this.sheet.set(null));
    }
  }

  /**
   * Method archive
   * @method archive
   *
   * @description
   * Archives the message and reports the outcome.
   *
   * @param {AdminMessage} message - Received or read message.
   *
   * @returns {Promise<void>} Resolves once the outcome is reported.
   */
  protected async archive(message: AdminMessage): Promise<void> {
    await this.store.archive(message);
    this.report(
      $localize`:@@admin.inbox.toast.archived:Message archivé.`,
      $localize`:@@admin.inbox.toast.archiveFailed:Le message n’a pas été archivé.`,
    );
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Deletes the message once the administrator confirms; deletion cannot be undone.
   *
   * @param {AdminMessage} message - Message selected for permanent erasure.
   *
   * @returns {Promise<void>} Resolves once the outcome is reported, or at once on cancel.
   */
  protected async remove(message: AdminMessage): Promise<void> {
    const confirmed: boolean = await this.confirmDialog.confirm({
      title: $localize`:@@admin.inbox.delete.title:Supprimer ce message ?`,
      description: $localize`:@@admin.inbox.delete.description:Le message de ${message.name}:name: sera effacé définitivement. Cette action ne peut pas être annulée.`,
      confirmLabel: $localize`:@@admin.inbox.delete.confirm:Supprimer`,
      tone: 'danger',
    });
    if (confirmed) {
      await this.store.remove(message);
      this.report(
        $localize`:@@admin.inbox.toast.deleted:Message supprimé.`,
        $localize`:@@admin.inbox.toast.deleteFailed:Le message n’a pas été supprimé.`,
      );
    }
  }

  /**
   * Method savePanes
   * @method savePanes
   *
   * @description
   * Remembers the list width after a drag, a key press or a reset on the separator; a width not
   * measured yet is not saved.
   *
   * @param {number | undefined} width - Message list width in pixels.
   */
  protected savePanes(width: number | undefined): void {
    if (!width) return;
    this.listWidth.set(Math.round(width));
    this.layouts.writePixels(INBOX_PANES_LAYOUT, width);
  }

  /**
   * Method resetPanes
   * @method resetPanes
   *
   * @description
   * Restores the default list width (380 px) on a double click of the separator, then saves it.
   *
   * @param {ResizablePanelGroupDirective} group - Group of the two panes.
   * @param {ResizableHandleComponent} handle - Separator between them.
   */
  protected resetPanes(
    group: ResizablePanelGroupDirective,
    handle: ResizableHandleComponent,
  ): void {
    const width: number = INBOX_PANES_LAYOUT.pixels.default;
    group.resizePixels(handle, width - (group.pixelSizes()[0] ?? width));
    group.commit();
  }

  /**
   * Method shortcut
   * @method shortcut
   *
   * @description
   * Mail-client keys on the reading pane: J / Down and K / Up move through the list, E archives the
   * open message (it is marked read by being shown, and the API has no way back to unread). Keys typed
   * in a field, with a modifier or inside a dialog other than the reading sheet are left alone.
   *
   * @param {KeyboardEvent} event - Key pressed anywhere in the window.
   */
  protected shortcut(event: KeyboardEvent): void {
    const message: AdminMessage | undefined = this.selected();
    const target: Element | null = event.target instanceof Element ? event.target : null;
    const dialog: Element | null | undefined = target?.closest(
      '[role="dialog"], [role="alertdialog"]',
    );
    if (
      !message ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      target?.closest('input, textarea, select, [contenteditable]') ||
      (dialog && !this.sheet()?.overlayRef.overlayElement.contains(dialog))
    ) {
      return;
    }
    const key: string = event.key.toLowerCase();
    if (key === 'j' || key === 'arrowdown') {
      this.move(message, 1);
    } else if (key === 'k' || key === 'arrowup') {
      this.move(message, -1);
    } else if (key === 'e' && message.status !== 'archived' && !this.store.writing()) {
      void this.archive(message);
    } else {
      return;
    }
    event.preventDefault();
  }

  /**
   * Method move
   * @method move
   *
   * @description
   * Opens the next or previous message of the page and focuses its row, which also scrolls it into view;
   * while the reading sheet is open the focus stays in it and the sheet shows the new message.
   * Stays on the open message at either end of the list.
   *
   * @param {AdminMessage} from - Message currently open.
   * @param {number} step - 1 for the next message, -1 for the previous one.
   */
  private move(from: AdminMessage, step: number): void {
    const messages: readonly AdminMessage[] = this.store.messages();
    const next: AdminMessage | undefined =
      messages[messages.findIndex((m) => m.id === from.id) + step];
    if (next) {
      this.open(next.id);
      if (!this.sheet()) {
        this.host.nativeElement.querySelector<HTMLElement>(`#message-${next.id}`)?.focus();
      }
    }
  }

  /**
   * Method open
   * @method open
   *
   * @description
   * Makes a message the open one. Leaving another message reloads the page when it holds rows that no
   * longer match the filter (read on "Non lus"), which stayed only while they were being read.
   *
   * @param {string} id - Message to open.
   */
  private open(id: string): void {
    if (id !== this.selected()?.id && this.store.outdated() > 0) void this.store.load();
    this.selectedId.set(id);
  }

  /**
   * Method autoRead
   * @method autoRead
   *
   * @description
   * Marks a message read once it has been shown, with the version of its current row in `If-Match`.
   * Success is silent, since reading is not an action; a 412 is silent as well, the store has reloaded
   * the actual state; any other failure is reported in an error toast and not retried.
   *
   * @param {string} id - Message shown for the reading delay.
   *
   * @returns {Promise<void>} Resolves once the outcome is applied.
   */
  private async autoRead(id: string): Promise<void> {
    const message: AdminMessage | undefined = this.store.messages().find((m) => m.id === id);
    if (message?.status !== 'received' || this.store.writing()) return;
    this.readAttempts.add(id);
    await this.store.markRead(message);
    const error: StoreError | null = this.store.writeCallState().error;
    if (error && error.status !== 412) {
      this.toasts.error(
        $localize`:@@admin.inbox.toast.readFailed:Le message n’a pas été marqué comme lu.`,
        { description: error.message },
      );
    }
    this.closeOrphanSheet();
  }

  /**
   * Method report
   * @method report
   *
   * @description
   * Turns the last write's outcome into a toast: success, a warning for a 412 conflict (the store has
   * already reloaded the list), or an error with the normalized cause. A reading sheet whose message
   * left the list is closed, so it never shows another message in its place.
   *
   * @param {string} success - Toast of a successful write.
   * @param {string} failure - Toast of a refused or failed write.
   */
  private report(success: string, failure: string): void {
    const error: StoreError | null = this.store.writeCallState().error;
    if (!error) {
      this.toasts.success(success);
    } else if (error.status === 412) {
      this.toasts.warning(INBOX_CONFLICT_MESSAGE);
    } else {
      this.toasts.error(failure, { description: error.message });
    }
    this.closeOrphanSheet();
  }

  /**
   * Method closeOrphanSheet
   * @method closeOrphanSheet
   *
   * @description
   * Closes a reading sheet whose message left the list, so it never shows another message in its
   * place.
   */
  private closeOrphanSheet(): void {
    const id: string | null = this.selectedId();
    const sheet: DialogRef<unknown> | null = this.sheet();
    if (sheet && !this.store.messages().some((m) => m.id === id)) {
      sheet.close();
    }
  }

  /**
   * Method watchWidth
   * @method watchWidth
   *
   * @description
   * Follows the two-pane breakpoint until the page is destroyed; widening the window closes the
   * reading sheet, since the second pane then shows the message. The admin renders in the browser only
   * (D18); the optional calls cover environments without `matchMedia`.
   *
   * @param {DestroyRef} destroyRef - Lifetime of the page, which removes the listener.
   */
  private watchWidth(destroyRef: DestroyRef): void {
    const query: MediaQueryList | undefined =
      this.document.defaultView?.matchMedia?.(INBOX_NARROW_QUERY);
    if (!query) {
      return;
    }
    this.narrow.set(query.matches);
    const listener: (event: MediaQueryListEvent) => void = (event: MediaQueryListEvent): void => {
      this.narrow.set(event.matches);
      if (!event.matches) {
        this.sheet()?.close();
      }
    };
    query.addEventListener('change', listener);
    destroyRef.onDestroy(() => {
      query.removeEventListener('change', listener);
      this.sheet()?.close();
    });
  }
  // #endregion
}
