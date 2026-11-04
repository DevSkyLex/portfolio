import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  type Signal,
  type WritableSignal,
  Injectable,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import type { SidebarControl } from '@vfortin/ui';
import {
  ADMIN_SIDEBAR_COLLAPSED_KEY,
  ADMIN_SIDEBAR_SHORTCUT,
} from '@internal/web-shell/lib/admin/layouts/admin-layout/constants/admin-sidebar-layout.constants';

/**
 * Service AdminSidebarStateService
 * @class AdminSidebarStateService
 *
 * @description
 * Collapsed or expanded state of the administration sidebar (D36), provided by the admin layout,
 * which also provides it as the catalogue's `SIDEBAR_CONTROL`: each feature page places a
 * `ui-sidebar-trigger` in its 48 px bar without importing the shell. The state is remembered per
 * viewer in `localStorage` like the sidebar width (`ResizableLayoutService`); a missing, invalid or
 * unreadable value expands the sidebar. Below 1024 px the sidebar is a top bar: the toggle is
 * unavailable there and the stored state waits for a wider window.
 */
@Injectable()
export class AdminSidebarStateService implements SidebarControl {
  // #region Properties
  /**
   * Property view
   * @readonly
   *
   * @description
   * Browser window whose storage holds the state; `null` outside the browser.
   *
   * @type {Window | null}
   */
  private readonly view: Window | null = isPlatformBrowser(inject<object>(PLATFORM_ID))
    ? inject<Document>(DOCUMENT).defaultView
    : null;

  /**
   * Property state
   * @readonly
   *
   * @description
   * Whether the viewer collapsed the sidebar, read from storage before the layout's first render so
   * that the rail never flashes open.
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly state: WritableSignal<boolean> = signal<boolean>(this.read());

  /**
   * Property narrowSource
   * @readonly
   *
   * @description
   * Narrow layout signal connected by the layout; wide until it connects one.
   *
   * @type {WritableSignal<Signal<boolean>>}
   */
  private readonly narrowSource: WritableSignal<Signal<boolean>> = signal<Signal<boolean>>(
    signal<boolean>(false),
  );

  /**
   * Property panelSource
   * @readonly
   *
   * @description
   * Id of the sidebar panel connected by the layout.
   *
   * @type {WritableSignal<Signal<string | null>>}
   */
  private readonly panelSource: WritableSignal<Signal<string | null>> = signal<
    Signal<string | null>
  >(signal<string | null>(null));

  /**
   * Property moving
   * @readonly
   *
   * @description
   * Whether a toggle's width transition is running; the layout animates the sidebar's flex only
   * meanwhile, so that dragging the separator and resizing the window follow the pointer at once.
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly moving: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property collapsed
   * @readonly
   *
   * @description
   * Stored collapsed state, whatever the window width.
   *
   * @type {Signal<boolean>}
   */
  public readonly collapsed: Signal<boolean> = this.state.asReadonly();

  /**
   * Property available
   * @readonly
   *
   * @description
   * Whether the sidebar can collapse: from 1024 px up, where it is a vertical sidebar.
   *
   * @type {Signal<boolean>}
   */
  public readonly available: Signal<boolean> = computed<boolean>(
    (): boolean => !this.narrowSource()(),
  );

  /**
   * Property rail
   * @readonly
   *
   * @description
   * Whether the sidebar shows as its icon rail: collapsed, in the wide layout.
   *
   * @type {Signal<boolean>}
   */
  public readonly rail: Signal<boolean> = computed<boolean>(
    (): boolean => this.state() && this.available(),
  );

  /**
   * Property expanded
   * @readonly
   *
   * @description
   * Whether the sidebar shows its full width, reflected by the triggers' `aria-expanded`.
   *
   * @type {Signal<boolean>}
   */
  public readonly expanded: Signal<boolean> = computed<boolean>((): boolean => !this.state());

  /**
   * Property controls
   * @readonly
   *
   * @description
   * Id of the sidebar's `aside`, referenced by the triggers' `aria-controls`.
   *
   * @type {Signal<string | null>}
   */
  public readonly controls: Signal<string | null> = computed<string | null>((): string | null =>
    this.panelSource()(),
  );

  /**
   * Property shortcut
   * @readonly
   *
   * @description
   * Toggle shortcut bound by the layout, shown in the triggers' tooltips.
   *
   * @type {Signal<readonly string[]>}
   */
  public readonly shortcut: Signal<readonly string[]> =
    signal<readonly string[]>(ADMIN_SIDEBAR_SHORTCUT).asReadonly();

  /**
   * Property transitioning
   * @readonly
   *
   * @description
   * Whether a toggle's width transition is running, until the layout calls `settle()`.
   *
   * @type {Signal<boolean>}
   */
  public readonly transitioning: Signal<boolean> = this.moving.asReadonly();
  // #endregion

  // #region Methods
  /**
   * Method connect
   * @method connect
   *
   * @description
   * Connects the layout's narrow layout signal and the id of its sidebar panel.
   *
   * @param {Signal<boolean>} narrow - Whether the window is below 1024 px.
   * @param {Signal<string | null>} panel - Id of the sidebar's `aside`, once rendered.
   * @returns {void}
   */
  public connect(narrow: Signal<boolean>, panel: Signal<string | null>): void {
    this.narrowSource.set(narrow);
    this.panelSource.set(panel);
  }

  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Collapses or expands the sidebar and remembers the choice; does nothing below 1024 px.
   *
   * @returns {void}
   */
  public toggle(): void {
    if (!this.available()) return;
    const collapsed: boolean = !this.state();
    this.moving.set(true);
    this.state.set(collapsed);
    try {
      this.view?.localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, JSON.stringify(collapsed));
    } catch {
      // Storage refused: the state lasts for the page only.
    }
  }

  /**
   * Method settle
   * @method settle
   *
   * @description
   * Ends the width transition started by `toggle()`, called by the layout when it ends or is
   * cancelled.
   *
   * @returns {void}
   */
  public settle(): void {
    this.moving.set(false);
  }

  /**
   * Method read
   * @method read
   *
   * @description
   * Reads the stored state: only the stored `true` collapses the sidebar.
   *
   * @returns {boolean} Whether the sidebar starts collapsed.
   */
  private read(): boolean {
    try {
      return this.view?.localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  }
  // #endregion
}
