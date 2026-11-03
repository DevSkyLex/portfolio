import {
  type Signal,
  ChangeDetectionStrategy,
  Component,
  type TemplateRef,
  inject,
  viewChild,
} from '@angular/core';
import {
  type DialogRef,
  DialogDescriptionDirective,
  DialogHeaderDirective,
  DialogService,
  DialogTitleDirective,
  KbdDirective,
  KbdGroupDirective,
} from '@vfortin/ui';
import { ADMIN_SHORTCUT_GROUPS } from '@internal/web-shell/lib/admin/layouts/admin-layout/components/shortcuts-dialog/constants/admin-shortcuts.constants';

/**
 * Component ShortcutsDialogComponent
 * @class ShortcutsDialogComponent
 *
 * @description
 * Keyboard shortcuts help of the administration (D36): opens in a dialog on `?` outside fields and
 * dialogs, or through `open()` from the command palette. It renders nothing in place.
 */
@Component({
  selector: 'app-shortcuts-dialog',
  imports: [
    DialogDescriptionDirective,
    DialogHeaderDirective,
    DialogTitleDirective,
    KbdDirective,
    KbdGroupDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:keydown)': 'shortcut($event)' },
  templateUrl: './shortcuts-dialog.component.html',
})
export class ShortcutsDialogComponent {
  // #region Properties
  /**
   * Property groups
   * @readonly
   *
   * @description
   * Shortcuts listed by the dialog, grouped by area.
   *
   * @type {typeof ADMIN_SHORTCUT_GROUPS}
   */
  protected readonly groups: typeof ADMIN_SHORTCUT_GROUPS = ADMIN_SHORTCUT_GROUPS;

  /**
   * Property dialogs
   * @readonly
   *
   * @description
   * Opens the help dialog.
   *
   * @type {DialogService}
   */
  private readonly dialogs: DialogService = inject<DialogService>(DialogService);

  /**
   * Property content
   * @readonly
   *
   * @description
   * Content of the help dialog.
   */
  private readonly content: Signal<TemplateRef<unknown>> =
    viewChild.required<TemplateRef<unknown>>('help');

  /**
   * Property ref
   *
   * @description
   * Open dialog, `null` while it is closed; a second `?` never stacks another one.
   *
   * @type {DialogRef<unknown> | null}
   */
  private ref: DialogRef<unknown> | null = null;
  // #endregion

  // #region Methods
  /**
   * Method open
   * @method open
   *
   * @description
   * Opens the help unless it is already open.
   */
  public open(): void {
    if (this.ref) {
      return;
    }
    const ref: DialogRef<unknown, unknown> = this.dialogs.open(this.content(), {
      // The admin is French only (D18); the catalogue default follows the build locale.
      closeLabel: 'Fermer',
      class: 'max-w-md gap-4 sm:p-6',
    });
    this.ref = ref;
    ref.closed.subscribe(() => (this.ref = null));
  }

  /**
   * Method shortcut
   * @method shortcut
   *
   * @description
   * Opens the help on `?`, read from the produced character so every keyboard layout works. A `?`
   * typed in a field, with Ctrl, Cmd or Alt, or inside an open dialog is left alone.
   *
   * @param {KeyboardEvent} event - Key pressed anywhere in the window.
   */
  protected shortcut(event: KeyboardEvent): void {
    const target: Element | null = event.target instanceof Element ? event.target : null;
    if (
      event.key !== '?' ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      target?.closest(
        'input, textarea, select, [contenteditable], [role="dialog"], [role="alertdialog"]',
      )
    ) {
      return;
    }
    event.preventDefault();
    this.open();
  }
  // #endregion
}
