import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import { type BreakpointState, BreakpointObserver } from '@angular/cdk/layout';
import {
  type Signal,
  Injectable,
  type WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import type { SidebarControl } from '@internal/ui/lib/sidebar/models/sidebar/sidebar-control.interface';
import type { SidebarState } from '@internal/ui/lib/sidebar/models/sidebar/sidebar-state.type';
import { SIDEBAR_MOBILE_QUERY } from '@internal/ui/lib/sidebar/constants/sidebar.constants';

/**
 * Service SidebarService
 * @class SidebarService
 *
 * @description
 * Stores sidebar state for one provider instance and switches between desktop expansion and mobile drawer visibility.
 * It is the provider's `SIDEBAR_CONTROL`, read by `ui-sidebar-trigger`.
 */
@Injectable()
export class SidebarService implements SidebarControl {
  // #region Properties
  /**
   * Property source
   * @readonly
   *
   * @description
   * Signal holding the provider's desktop open model so state changes update the same source of truth.
   *
   * @type {WritableSignal<WritableSignal<boolean>>}
   */
  private readonly source: WritableSignal<WritableSignal<boolean>> = signal<
    WritableSignal<boolean>
  >(signal<boolean>(true));

  /**
   * Property shortcutSource
   * @readonly
   *
   * @description
   * Signal holding the provider's shortcut switch, off until a provider connects one.
   *
   * @type {WritableSignal<Signal<boolean>>}
   */
  private readonly shortcutSource: WritableSignal<Signal<boolean>> = signal<Signal<boolean>>(
    signal<boolean>(false),
  );

  /**
   * Property query
   * @readonly
   *
   * @description
   * Current mobile breakpoint state observed from the CDK breakpoint observer.
   *
   * @type {Signal<BreakpointState | undefined>}
   */
  private readonly query: Signal<BreakpointState | undefined> = toSignal(
    inject<BreakpointObserver>(BreakpointObserver).observe(SIDEBAR_MOBILE_QUERY),
  );

  /**
   * Property open
   * @readonly
   *
   * @description
   * Desktop open state read through the connected provider model.
   *
   * @type {Signal<boolean>}
   */
  public readonly open: Signal<boolean> = computed<boolean>((): boolean => this.source()());

  /**
   * Property openMobile
   * @readonly
   *
   * @description
   * Mobile drawer visibility state, independent of the desktop provider model.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly openMobile: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property isMobile
   * @readonly
   *
   * @description
   * Whether the current viewport matches the drawer breakpoint; defaults to false before the observer emits.
   *
   * @type {Signal<boolean>}
   */
  public readonly isMobile: Signal<boolean> = computed<boolean>(
    (): boolean => this.query()?.matches ?? false,
  );

  /**
   * Property state
   * @readonly
   *
   * @description
   * Desktop expanded or collapsed label derived from the connected open state.
   *
   * @type {Signal<SidebarState>}
   */
  public readonly state: Signal<SidebarState> = computed<SidebarState>(
    (): 'expanded' | 'collapsed' => (this.open() ? 'expanded' : 'collapsed'),
  );

  /**
   * Property expanded
   * @readonly
   *
   * @description
   * Effective visibility across layouts: mobile drawer state on small viewports and desktop open state otherwise.
   *
   * @type {Signal<boolean>}
   */
  public readonly expanded: Signal<boolean> = computed<boolean>((): boolean =>
    this.isMobile() ? this.openMobile() : this.open(),
  );

  /**
   * Property sidebarId
   * @readonly
   *
   * @description
   * Unique id for the sidebar panel and controls that reference it.
   *
   * @type {string}
   */
  public readonly sidebarId: string = inject<RenderIdService>(RenderIdService).next('ui-sidebar-');

  /**
   * Property available
   * @readonly
   *
   * @description
   * Always `true`: the trigger toggles the desktop sidebar or, on small viewports, its drawer.
   *
   * @type {Signal<boolean>}
   */
  public readonly available: Signal<boolean> = signal<boolean>(true).asReadonly();

  /**
   * Property controls
   * @readonly
   *
   * @description
   * Desktop sidebar panel id; `null` on small viewports, where the drawer exists only while open.
   *
   * @type {Signal<string | null>}
   */
  public readonly controls: Signal<string | null> = computed<string | null>((): string | null =>
    this.isMobile() ? null : this.sidebarId,
  );

  /**
   * Property shortcut
   * @readonly
   *
   * @description
   * Ctrl/Cmd+B while the provider binds it.
   *
   * @type {Signal<readonly string[]>}
   */
  public readonly shortcut: Signal<readonly string[]> = computed<readonly string[]>(
    (): readonly string[] => (this.shortcutSource()() ? ['Mod', 'B'] : []),
  );
  // #endregion

  // #region Methods
  /**
   * Method connect
   * @method connect
   *
   * @description
   * Connects the provider's writable model so desktop state updates are reflected back to its owner,
   * and the switch of its Ctrl/Cmd+B shortcut.
   *
   * @param {WritableSignal<boolean>} open - Provider-owned desktop open model.
   * @param {Signal<boolean>} shortcut - Whether the provider binds Ctrl/Cmd+B.
   * @returns {void}
   */
  public connect(
    open: WritableSignal<boolean>,
    shortcut: Signal<boolean> = signal<boolean>(false),
  ): void {
    this.source.set(open);
    this.shortcutSource.set(shortcut);
  }

  /**
   * Method setOpen
   * @method setOpen
   *
   * @description
   * Sets the connected desktop open model to the requested value.
   *
   * @param {boolean} open - Whether the desktop sidebar should be expanded.
   * @returns {void}
   */
  public setOpen(open: boolean): void {
    this.source().set(open);
  }

  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Toggles mobile drawer visibility on small viewports or desktop expansion on larger viewports.
   *
   * @returns {void}
   */
  public toggle(): void {
    if (this.isMobile()) this.openMobile.update((open: boolean): boolean => !open);
    else this.setOpen(!this.open());
  }
  // #endregion
}
