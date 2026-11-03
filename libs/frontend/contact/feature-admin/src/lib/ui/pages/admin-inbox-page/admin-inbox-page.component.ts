import type { InboxFilter } from '@internal/contact-web-feature-admin/lib/models/inbox-filter/inbox-filter.interface';

import {
  type Signal,
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideCircleAlert, lucideInbox, lucideTriangleAlert } from '@ng-icons/lucide';
import {
  type AdminMessage,
  AdminInboxStore,
  type AdminInboxStoreType,
} from '@vfortin/contact-web-data-access';
import {
  AlertDirective,
  ConfirmDialogService,
  EmptyDescriptionDirective,
  EmptyDirective,
  EmptyHeaderDirective,
  EmptyMediaDirective,
  EmptyTitleDirective,
  SkeletonDirective,
  ToggleGroupDirective,
  ToggleGroupItemDirective,
} from '@vfortin/ui';
import { INBOX_FILTERS } from '@internal/contact-web-feature-admin/lib/constants/inbox-filters.constants';
import type { InboxFilterKey } from '@internal/contact-web-feature-admin/lib/models/inbox-filter/inbox-filter-key.type';
import { MessageDetailComponent } from '@internal/contact-web-feature-admin/lib/ui/components/message-detail/message-detail.component';
import { MessageListDataviewComponent } from '@internal/contact-web-feature-admin/lib/ui/dataviews/message-list-dataview/message-list-dataview.component';

/**
 * Component AdminInboxPageComponent
 * @class AdminInboxPageComponent
 *
 * @description
 * Two-pane administrator inbox (D36): owns the inbox store, the status filter, the open message, the
 * mail-client shortcuts and the deletion confirmation; the list and the reading pane only render.
 */
@Component({
  selector: 'contact-admin-inbox-page',
  imports: [
    AlertDirective,
    EmptyDescriptionDirective,
    EmptyDirective,
    EmptyHeaderDirective,
    EmptyMediaDirective,
    EmptyTitleDirective,
    MessageDetailComponent,
    MessageListDataviewComponent,
    NgIcon,
    SkeletonDirective,
    ToggleGroupDirective,
    ToggleGroupItemDirective,
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
   * Lucide icons of the error and conflict notices and of the empty state.
   */
  protected readonly icons: {
    readonly conflict: typeof lucideTriangleAlert;
    readonly empty: typeof lucideInbox;
    readonly error: typeof lucideCircleAlert;
  } = {
    conflict: lucideTriangleAlert,
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
   * Starts the initial inbox request after the page-level store has been provided.
   */
  public constructor() {
    void this.store.load();
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
   * Opens a message in the reading pane.
   *
   * @param {AdminMessage} message - Message picked in the list.
   */
  protected select(message: AdminMessage): void {
    this.selectedId.set(message.id);
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Deletes the message once the administrator confirms; deletion cannot be undone.
   *
   * @param {AdminMessage} message - Message selected for permanent erasure.
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
    }
  }

  /**
   * Method shortcut
   * @method shortcut
   *
   * @description
   * Mail-client keys on the reading pane: J / Down and K / Up move through the list, R marks the open
   * message as read, E archives it. Keys typed in a field, with a modifier or while a dialog is open are
   * left alone.
   *
   * @param {KeyboardEvent} event - Key pressed anywhere in the window.
   */
  protected shortcut(event: KeyboardEvent): void {
    const message: AdminMessage | undefined = this.selected();
    const target: Element | null = event.target instanceof Element ? event.target : null;
    if (
      !message ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      target?.closest('input, textarea, select, [contenteditable], [role="alertdialog"]')
    ) {
      return;
    }
    const key: string = event.key.toLowerCase();
    if (key === 'j' || key === 'arrowdown') {
      this.move(message, 1);
    } else if (key === 'k' || key === 'arrowup') {
      this.move(message, -1);
    } else if (key === 'r' && message.status === 'received' && !this.store.writing()) {
      void this.store.markRead(message);
    } else if (key === 'e' && message.status !== 'archived' && !this.store.writing()) {
      void this.store.archive(message);
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
   * Opens the next or previous message of the page and focuses its row, which also scrolls it into view.
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
      this.host.nativeElement.querySelector<HTMLElement>(`#message-${next.id}`)?.focus();
    }
  }
  // #endregion
}
