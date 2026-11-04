import type { Signal } from '@angular/core';

/**
 * Interface SidebarControl
 * @interface SidebarControl
 *
 * @description
 * Narrow contract between a sidebar owner and the `ui-sidebar-trigger` placed anywhere below it, in
 * the manner of shadcn's `SidebarProvider` and `SidebarTrigger`: the catalogue's `SidebarService`
 * implements it for `uiSidebarProvider`, and an application layout with its own sidebar provides it
 * under `SIDEBAR_CONTROL`, so that pages of other libraries place the trigger without importing the
 * layout.
 */
export interface SidebarControl {
  // #region Properties
  /**
   * Property expanded
   * @readonly
   *
   * @description
   * Whether the sidebar currently shows its full width (or its drawer), reflected by `aria-expanded`.
   *
   * @type {Signal<boolean>}
   */
  readonly expanded: Signal<boolean>;

  /**
   * Property available
   * @readonly
   *
   * @description
   * Whether toggling means anything in the current layout; the trigger renders nothing otherwise.
   *
   * @type {Signal<boolean>}
   */
  readonly available: Signal<boolean>;

  /**
   * Property controls
   * @readonly
   *
   * @description
   * Id of the element the trigger controls (`aria-controls`), `null` when none is in the page.
   *
   * @type {Signal<string | null>}
   */
  readonly controls: Signal<string | null>;

  /**
   * Property shortcut
   * @readonly
   *
   * @description
   * Keys of the owner's toggle shortcut, `Mod` standing for the platform modifier (`Mod B`, or a
   * single key), shown as tooltip caps and `aria-keyshortcuts`; empty when the owner binds none.
   *
   * @type {Signal<readonly string[]>}
   */
  readonly shortcut: Signal<readonly string[]>;
  // #endregion

  // #region Methods
  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Collapses an expanded sidebar or expands a collapsed one.
   *
   * @returns {void}
   */
  toggle(): void;
  // #endregion
}
