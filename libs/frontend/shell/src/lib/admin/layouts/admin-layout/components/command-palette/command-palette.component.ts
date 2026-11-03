import {
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  ChangeDetectionStrategy,
  Component,
  type TemplateRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import {
  lucideCircleCheckBig,
  lucideCircleDashed,
  lucideExternalLink,
  lucideKeyboard,
  lucideLogOut,
} from '@ng-icons/lucide';
import type { AdminProjectNavigationItem } from '@vfortin/content-web-data-access/navigation';
import { CommandImports, type DialogRef, DialogService } from '@vfortin/ui';
import type { AdminLink } from '@internal/web-shell/lib/admin/layouts/admin-layout/models/admin-link/admin-link.interface';

/**
 * Component CommandPaletteComponent
 * @class CommandPaletteComponent
 *
 * @description
 * Administration command palette (D36): opens in a dialog on Ctrl/Cmd+K or through `open()`, lists
 * the sections, the projects and the actions, closes itself and reports the chosen command. It
 * renders nothing in place; the layout loads the projects and carries out the commands.
 */
@Component({
  selector: 'app-command-palette',
  imports: [CommandImports, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown.control.k)': 'shortcut($event)',
    '(window:keydown.meta.k)': 'shortcut($event)',
  },
  templateUrl: './command-palette.component.html',
})
export class CommandPaletteComponent {
  // #region Properties
  /**
   * Property links
   * @readonly
   *
   * @description
   * Sections of the "Aller à" group.
   *
   * @type {InputSignal<readonly AdminLink[]>}
   */
  public readonly links: InputSignal<readonly AdminLink[]> = input.required<readonly AdminLink[]>();

  /**
   * Property projects
   * @readonly
   *
   * @description
   * Projects of the "Projets" group; the group is hidden while the list is empty.
   *
   * @type {InputSignal<readonly AdminProjectNavigationItem[]>}
   */
  public readonly projects: InputSignal<readonly AdminProjectNavigationItem[]> = input<
    readonly AdminProjectNavigationItem[]
  >([]);

  /**
   * Property opened
   * @readonly
   *
   * @description
   * Emits each time the palette opens, so the layout can refresh the projects.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly opened: OutputEmitterRef<void> = output<void>();

  /**
   * Property pageSelected
   * @readonly
   *
   * @description
   * Emits the admin path of a chosen section or project, once the palette is closed.
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly pageSelected: OutputEmitterRef<string> = output<string>();

  /**
   * Property siteSelected
   * @readonly
   *
   * @description
   * Emits when "Voir le site" is chosen, once the palette is closed.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly siteSelected: OutputEmitterRef<void> = output<void>();

  /**
   * Property logoutSelected
   * @readonly
   *
   * @description
   * Emits when "Se déconnecter" is chosen, once the palette is closed.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly logoutSelected: OutputEmitterRef<void> = output<void>();

  /**
   * Property shortcutsSelected
   * @readonly
   *
   * @description
   * Emits when "Raccourcis clavier" is chosen, once the palette is closed.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly shortcutsSelected: OutputEmitterRef<void> = output<void>();

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the project statuses and the actions.
   */
  protected readonly icons: {
    readonly draft: typeof lucideCircleDashed;
    readonly keyboard: typeof lucideKeyboard;
    readonly logout: typeof lucideLogOut;
    readonly published: typeof lucideCircleCheckBig;
    readonly site: typeof lucideExternalLink;
  } = {
    draft: lucideCircleDashed,
    keyboard: lucideKeyboard,
    logout: lucideLogOut,
    published: lucideCircleCheckBig,
    site: lucideExternalLink,
  } as const;

  /**
   * Property dialogs
   * @readonly
   *
   * @description
   * Opens the palette dialog.
   *
   * @type {DialogService}
   */
  private readonly dialogs: DialogService = inject<DialogService>(DialogService);

  /**
   * Property content
   * @readonly
   *
   * @description
   * Content of the palette dialog.
   */
  private readonly content: Signal<TemplateRef<unknown>> =
    viewChild.required<TemplateRef<unknown>>('palette');

  /**
   * Property ref
   *
   * @description
   * Open palette, `null` while it is closed; a second Ctrl+K never stacks another one.
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
   * Opens the palette unless it is already open.
   */
  public open(): void {
    if (this.ref) {
      return;
    }
    const ref: DialogRef<unknown, unknown> = this.dialogs.open(this.content(), {
      ariaLabel: 'Palette de commandes',
      showClose: false,
      class: 'max-w-xl gap-0 p-0 sm:p-0',
    });
    this.ref = ref;
    ref.closed.subscribe(() => (this.ref = null));
    this.opened.emit();
  }

  /**
   * Method shortcut
   * @method shortcut
   *
   * @description
   * Opens the palette on Ctrl+K / Cmd+K instead of the browser's address-bar search.
   *
   * @param {Event} event - Keyboard event of the shortcut.
   */
  protected shortcut(event: Event): void {
    event.preventDefault();
    this.open();
  }

  /**
   * Method choosePage
   * @method choosePage
   *
   * @description
   * Closes the palette and reports the chosen admin path.
   *
   * @param {string} path - Absolute admin path.
   */
  protected choosePage(path: string): void {
    this.ref?.close();
    this.pageSelected.emit(path);
  }

  /**
   * Method chooseSite
   * @method chooseSite
   *
   * @description
   * Closes the palette and reports "Voir le site".
   */
  protected chooseSite(): void {
    this.ref?.close();
    this.siteSelected.emit();
  }

  /**
   * Method chooseShortcuts
   * @method chooseShortcuts
   *
   * @description
   * Closes the palette and reports "Raccourcis clavier".
   */
  protected chooseShortcuts(): void {
    this.ref?.close();
    this.shortcutsSelected.emit();
  }

  /**
   * Method chooseLogout
   * @method chooseLogout
   *
   * @description
   * Closes the palette and reports "Se déconnecter".
   */
  protected chooseLogout(): void {
    this.ref?.close();
    this.logoutSelected.emit();
  }
  // #endregion
}
