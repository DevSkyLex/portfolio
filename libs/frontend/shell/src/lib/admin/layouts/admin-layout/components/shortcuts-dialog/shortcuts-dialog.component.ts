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
  DialogFooterDirective,
  DialogHeaderDirective,
  DialogService,
  DialogTitleDirective,
  KbdDirective,
  KbdGroupDirective,
  KbdHintComponent,
  ModifierKeyService,
  TabsContentDirective,
  TabsDirective,
  TabsListDirective,
  TabsTriggerDirective,
} from '@vfortin/ui';
import { ADMIN_MODIFIER } from '@internal/web-shell/lib/admin/layouts/admin-layout/components/shortcuts-dialog/constants/admin-modifier.constants';
import type { AdminShortcut } from '@internal/web-shell/lib/admin/layouts/admin-layout/components/shortcuts-dialog/models/admin-shortcut/admin-shortcut.interface';
import type { AdminShortcutGroup } from '@internal/web-shell/lib/admin/layouts/admin-layout/components/shortcuts-dialog/models/admin-shortcut/admin-shortcut-group.interface';
import { ADMIN_ESCAPE_KEYS } from '@internal/web-shell/lib/admin/layouts/admin-layout/constants/admin-keys.constants';
import { ADMIN_SHORTCUT_GROUPS } from '@internal/web-shell/lib/admin/layouts/admin-layout/components/shortcuts-dialog/constants/admin-shortcuts.constants';

/**
 * Component ShortcutsDialogComponent
 * @class ShortcutsDialogComponent
 *
 * @description
 * Keyboard shortcuts help of the administration (D36): opens in a dialog on `?` outside fields and
 * dialogs, or through `open()` from the command palette, and recalls `?` and Escape in its footer
 * bar. It renders nothing in place.
 */
@Component({
  selector: 'app-shortcuts-dialog',
  imports: [
    DialogDescriptionDirective,
    DialogFooterDirective,
    DialogHeaderDirective,
    DialogTitleDirective,
    KbdDirective,
    KbdGroupDirective,
    KbdHintComponent,
    TabsContentDirective,
    TabsDirective,
    TabsListDirective,
    TabsTriggerDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:keydown)': 'shortcut($event)' },
  templateUrl: './shortcuts-dialog.component.html',
})
export class ShortcutsDialogComponent {
  // #region Properties
  /**
   * Property escapeKeys
   * @readonly
   *
   * @description
   * Escape key cap of the footer hint, in the build locale.
   *
   * @type {readonly string[]}
   */
  protected readonly escapeKeys: readonly string[] = ADMIN_ESCAPE_KEYS;

  /**
   * Property groups
   * @readonly
   *
   * @description
   * Shortcuts listed by the dialog, grouped by area, with the platform's modifier only: « Ctrl K »
   * on Windows and Linux, « ⌘ K » on macOS, spoken « Contrôle K » or « Commande K »; the words
   * and the shift cap (`Maj` in French, `Shift` in English) follow the build locale.
   *
   * @type {readonly AdminShortcutGroup[]}
   */
  protected readonly groups: readonly AdminShortcutGroup[] = ((): readonly AdminShortcutGroup[] => {
    const modifier: ModifierKeyService = inject<ModifierKeyService>(ModifierKeyService);
    const words: Readonly<Record<string, string>> = {
      [ADMIN_MODIFIER]: modifier.apple
        ? $localize`:@@admin.shell.shortcuts.spoken.command:Commande`
        : $localize`:@@admin.shell.shortcuts.spoken.control:Contrôle`,
      Alt: modifier.apple ? 'Option' : 'Alt',
      Shift: $localize`:@@admin.shell.shortcuts.spoken.shift:Majuscule`,
    };
    // Off Apple platforms the shift cap is spelled in the build locale.
    const shift: string = $localize`:@@admin.shell.shortcuts.key.shift:Maj`;
    return ADMIN_SHORTCUT_GROUPS.map((group: AdminShortcutGroup): AdminShortcutGroup => ({
      ...group,
      shortcuts: group.shortcuts.map((shortcut: AdminShortcut): AdminShortcut => ({
        ...shortcut,
        combos: shortcut.combos.map((combo: readonly string[]): readonly string[] =>
          modifier.caps(combo).map((key: string): string => (key === 'Shift' ? shift : key)),
        ),
        spoken: shortcut.spoken
          .split(' ')
          .map((word: string): string => words[word] ?? word)
          .join(' '),
      })),
    }));
  })();

  /**
   * Property dialogs
   * @readonly
   *
   * @description
   * Opens the help dialog.
   *
   * @type {DialogService}
   */
  /**
   * Property tabs
   * @readonly
   *
   * @description
   * Tabs of the help, each holding the groups of one context: the shell-wide keys, the project
   * editor with its article toolbar, and the inbox.
   *
   * @type {readonly { readonly id: string; readonly label: string; readonly groups: readonly AdminShortcutGroup[] }[]}
   */
  protected readonly tabs: readonly {
    readonly id: string;
    readonly label: string;
    readonly groups: readonly AdminShortcutGroup[];
  }[] = (
    [
      {
        id: 'general',
        label: $localize`:@@admin.shell.shortcuts.tab.general:Général`,
        groups: ['general'],
      },
      {
        id: 'editor',
        label: $localize`:@@admin.shell.shortcuts.tab.editor:Édition`,
        groups: ['projects', 'article'],
      },
      {
        id: 'inbox',
        label: $localize`:@@admin.shell.shortcuts.tab.inbox:Messages`,
        groups: ['messages'],
      },
    ] as const
  ).map(({ id, label, groups }) => ({
    id,
    label,
    groups: this.groups.filter((group: AdminShortcutGroup): boolean =>
      (groups as readonly AdminShortcutGroup['id'][]).includes(group.id),
    ),
  }));

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
      // The inset, not `sm:p-6`, so the header and footer bars keep reaching the panel edges.
      size: 'md',
      class: 'gap-5',
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
