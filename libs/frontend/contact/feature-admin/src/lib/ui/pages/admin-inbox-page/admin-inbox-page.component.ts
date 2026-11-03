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
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideCircleAlert, lucideInbox, lucideX } from '@ng-icons/lucide';
import {
  type AdminMessage,
  AdminInboxStore,
  type AdminInboxStoreType,
  type StoreError,
} from '@vfortin/contact-web-data-access';
import {
  type DialogRef,
  AlertDirective,
  ButtonDirective,
  ConfirmDialogService,
  EmptyDescriptionDirective,
  EmptyDirective,
  EmptyHeaderDirective,
  EmptyMediaDirective,
  EmptyTitleDirective,
  SheetCloseDirective,
  SheetService,
  SheetTitleDirective,
  SkeletonDirective,
  ToastService,
  ToggleGroupDirective,
  ToggleGroupItemDirective,
  TooltipDirective,
} from '@vfortin/ui';
import { INBOX_FILTERS } from '@internal/contact-web-feature-admin/lib/constants/inbox-filters.constants';
import { INBOX_NARROW_QUERY } from '@internal/contact-web-feature-admin/lib/constants/inbox-layout.constants';
import { INBOX_CONFLICT_MESSAGE } from '@internal/contact-web-feature-admin/lib/constants/inbox-toasts.constants';
import type { InboxFilterKey } from '@internal/contact-web-feature-admin/lib/models/inbox-filter/inbox-filter-key.type';
import { MessageDetailComponent } from '@internal/contact-web-feature-admin/lib/ui/components/message-detail/message-detail.component';
import { MessageListDataviewComponent } from '@internal/contact-web-feature-admin/lib/ui/dataviews/message-list-dataview/message-list-dataview.component';

/**
 * Component AdminInboxPageComponent
 * @class AdminInboxPageComponent
 *
 * @description
 * Administrator inbox (D36): owns the inbox store, the status filter, the open message, the
 * mail-client shortcuts, the deletion confirmation and the outcome toasts; the list and the reading
 * pane only render. Wide screens show two panes; below 1024 px the list fills the page and a message
 * opens in a right sheet.
 */
@Component({
  selector: 'contact-admin-inbox-page',
  imports: [
    AlertDirective,
    ButtonDirective,
    EmptyDescriptionDirective,
    EmptyDirective,
    EmptyHeaderDirective,
    EmptyMediaDirective,
    EmptyTitleDirective,
    MessageDetailComponent,
    MessageListDataviewComponent,
    NgIcon,
    SheetCloseDirective,
    SheetTitleDirective,
    SkeletonDirective,
    ToggleGroupDirective,
    ToggleGroupItemDirective,
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
   *
   * @description
   * Open reading sheet, `null` while it is closed; picking another row never stacks a second one.
   *
   * @type {DialogRef<unknown> | null}
   */
  private sheet: DialogRef<unknown> | null = null;

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
   * Property filterKey
   * @readonly
   *
   * @description
   * Pressed status filter; the store's `null` status is the "Tous" filter.
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
   * Status filters of the title bar.
   *
   * @type {typeof INBOX_FILTERS}
   */
  protected readonly filters: typeof INBOX_FILTERS = INBOX_FILTERS;

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the load failure notice, the empty state and the sheet's close button.
   */
  protected readonly icons: {
    readonly close: typeof lucideX;
    readonly empty: typeof lucideInbox;
    readonly error: typeof lucideCircleAlert;
  } = {
    close: lucideX,
    empty: lucideInbox,
    error: lucideCircleAlert,
  } as const;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Starts the initial inbox request after the page-level store has been provided and follows the
   * two-pane breakpoint.
   */
  public constructor() {
    void this.store.load();
    this.watchWidth(inject<DestroyRef>(DestroyRef));
  }
  // #endregion

  // #region Methods
  /**
   * Method applyFilter
   * @method applyFilter
   *
   * @description
   * Loads the filter pressed in the title bar; the group is `required`, so one filter stays pressed.
   *
   * @param {unknown} key - New toggle group value.
   */
  protected applyFilter(key: unknown): void {
    const filter: InboxFilter | undefined = this.filters.find((candidate) => candidate.key === key);
    if (filter && filter.key !== this.filterKey()) {
      void this.store.filter(filter.status);
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
    this.selectedId.set(message.id);
    if (this.narrow() && !this.sheet) {
      const sheet: DialogRef<unknown, unknown> = this.sheets.open(this.reading(), {
        side: 'right',
        showClose: false,
        // The title takes the focus: the close button would open its tooltip on arrival.
        autoFocus: 'first-heading',
        class: 'max-w-[640px] gap-0 p-0',
      });
      this.sheet = sheet;
      sheet.closed.subscribe(() => (this.sheet = null));
    }
  }

  /**
   * Method markRead
   * @method markRead
   *
   * @description
   * Marks the message as read and reports the outcome.
   *
   * @param {AdminMessage} message - Received message.
   *
   * @returns {Promise<void>} Resolves once the outcome is reported.
   */
  protected async markRead(message: AdminMessage): Promise<void> {
    await this.store.markRead(message);
    this.report('Message marqué comme lu.', 'Le message n’a pas été marqué comme lu.');
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
    this.report('Message archivé.', 'Le message n’a pas été archivé.');
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
      title: 'Supprimer ce message ?',
      description: `Le message de ${message.name} sera effacé définitivement. Cette action ne peut pas être annulée.`,
      confirmLabel: 'Supprimer',
      // The admin is French only (D18); the catalogue default follows the build locale.
      cancelLabel: 'Annuler',
      tone: 'danger',
    });
    if (confirmed) {
      await this.store.remove(message);
      this.report('Message supprimé.', 'Le message n’a pas été supprimé.');
    }
  }

  /**
   * Method shortcut
   * @method shortcut
   *
   * @description
   * Mail-client keys on the reading pane: J / Down and K / Up move through the list, R marks the open
   * message as read, E archives it. Keys typed in a field, with a modifier or inside a dialog other
   * than the reading sheet are left alone.
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
      (dialog && !this.sheet?.overlayRef.overlayElement.contains(dialog))
    ) {
      return;
    }
    const key: string = event.key.toLowerCase();
    if (key === 'j' || key === 'arrowdown') {
      this.move(message, 1);
    } else if (key === 'k' || key === 'arrowup') {
      this.move(message, -1);
    } else if (key === 'r' && message.status === 'received' && !this.store.writing()) {
      void this.markRead(message);
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
      this.selectedId.set(next.id);
      if (!this.sheet) {
        this.host.nativeElement.querySelector<HTMLElement>(`#message-${next.id}`)?.focus();
      }
    }
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
    const id: string | null = this.selectedId();
    if (this.sheet && !this.store.messages().some((m) => m.id === id)) {
      this.sheet.close();
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
        this.sheet?.close();
      }
    };
    query.addEventListener('change', listener);
    destroyRef.onDestroy(() => {
      query.removeEventListener('change', listener);
      this.sheet?.close();
    });
  }
  // #endregion
}
