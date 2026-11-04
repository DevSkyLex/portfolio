import { Dialog, type DialogRef } from '@angular/cdk/dialog';
import { type GlobalPositionStrategy, createGlobalPositionStrategy } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';
import {
  type InputSignal,
  type Signal,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  type TemplateRef,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucidePanelLeft } from '@ng-icons/lucide';
import { ButtonDirective } from '@internal/ui/lib/button/button.directive';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { ModifierKeyService } from '@internal/ui/lib/kbd/services/modifier-key/modifier-key.service';
import type { SidebarControl } from '@internal/ui/lib/sidebar/models/sidebar/sidebar-control.interface';
import { SIDEBAR_CONTROL } from '@internal/ui/lib/sidebar/tokens/sidebar-control/sidebar-control.token';
import { TooltipDirective } from '@internal/ui/lib/tooltip/tooltip.directive';
import { SidebarService } from '@internal/ui/lib/sidebar/services/sidebar/sidebar.service';
import type { SidebarCollapsible } from '@internal/ui/lib/sidebar/models/sidebar/sidebar-collapsible.type';
import type { SidebarSide } from '@internal/ui/lib/sidebar/models/sidebar/sidebar-side.type';
import type { SidebarVariant } from '@internal/ui/lib/sidebar/models/sidebar/sidebar-variant.type';

/**
 * Component SidebarComponent
 * @class SidebarComponent
 *
 * @description
 * Provides desktop sidebar layout and a CDK dialog drawer on mobile. Desktop collapse can move
 * the sidebar off canvas or reduce it to icons according to the selected mode.
 */
@Component({
  selector: 'ui-sidebar',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    'data-slot': 'sidebar',
    '[attr.data-state]': 'sidebar.state()',
    '[attr.data-collapsible]': 'sidebar.state() === "collapsed" ? collapsible() : ""',
    '[attr.data-variant]': 'variant()',
    '[attr.data-side]': 'side()',
  },
  template: `
    <ng-template #content><ng-content /></ng-template>
    <ng-template #drawer>
      <div
        class="flex h-full w-72 max-w-[85vw] flex-col border-border bg-surface-raised text-fg"
        data-slot="sidebar"
        data-mobile="true"
        [class.border-r]="side() === 'left'"
        [class.border-l]="side() === 'right'"
      >
        <ng-container [ngTemplateOutlet]="content" />
      </div>
    </ng-template>
    @if (collapsible() === 'none') {
      <ng-container [ngTemplateOutlet]="content" />
    } @else if (!sidebar.isMobile()) {
      <div [class]="gapClasses()"></div>
      <div
        [id]="sidebar.sidebarId"
        [class]="containerClasses()"
        [attr.inert]="hidden() ? '' : null"
      >
        <div [class]="innerClasses()">
          <ng-container [ngTemplateOutlet]="content" />
        </div>
      </div>
    }
  `,
})
export class SidebarComponent {
  // #region Properties
  /**
   * Property sidebar
   * @readonly
   *
   * @description
   * Provider state controlling desktop expansion and mobile drawer visibility.
   *
   * @type {SidebarService}
   */
  protected readonly sidebar: SidebarService = inject<SidebarService>(SidebarService);

  /**
   * Property side
   * @readonly
   *
   * @description
   * Viewport edge used to position the sidebar and mobile drawer.
   *
   * @type {InputSignal<SidebarSide>}
   */
  public readonly side: InputSignal<SidebarSide> = input<SidebarSide>('left');

  /**
   * Property variant
   * @readonly
   *
   * @description
   * Desktop surface style, including raised card treatment for the floating variant.
   *
   * @type {InputSignal<SidebarVariant>}
   */
  public readonly variant: InputSignal<SidebarVariant> = input<SidebarVariant>('sidebar');

  /**
   * Property collapsible
   * @readonly
   *
   * @description
   * Desktop collapse mode; `none` keeps the component in normal layout flow.
   *
   * @type {InputSignal<SidebarCollapsible>}
   */
  public readonly collapsible: InputSignal<SidebarCollapsible> =
    input<SidebarCollapsible>('offcanvas');

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible name applied to the modal mobile drawer.
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input<string>(
    $localize`:@@ui.sidebar.label:Barre latérale`,
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes applied to the sidebar host.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property drawer
   * @readonly
   *
   * @description
   * Template for the mobile drawer content projected from this sidebar.
   *
   * @type {Signal<TemplateRef<unknown>>}
   */
  private readonly drawer: Signal<TemplateRef<unknown>> =
    viewChild.required<TemplateRef<unknown>>('drawer');

  /**
   * Property dialog
   * @readonly
   *
   * @description
   * CDK dialog service used to present the sidebar as a mobile modal drawer.
   *
   * @type {Dialog}
   */
  private readonly dialog: Dialog = inject<Dialog>(Dialog);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Injector used by the CDK global position strategy.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property viewContainerRef
   * @readonly
   *
   * @description
   * View container used to attach the mobile drawer template in the dialog.
   *
   * @type {ViewContainerRef}
   */
  private readonly viewContainerRef: ViewContainerRef = inject<ViewContainerRef>(ViewContainerRef);

  /**
   * Property drawerRef
   *
   * @description
   * Active mobile drawer dialog reference, or `null` when the drawer is closed.
   *
   * @type {DialogRef<unknown, unknown> | null}
   */
  private drawerRef: DialogRef<unknown, unknown> | null = null;

  /**
   * Property hidden
   * @readonly
   *
   * @description
   * Whether an off-canvas collapsed sidebar must be removed from interaction with `inert`.
   *
   * @type {Signal<boolean>}
   */
  protected readonly hidden: Signal<boolean> = computed<boolean>(
    (): boolean => this.sidebar.state() === 'collapsed' && this.collapsible() === 'offcanvas',
  );

  /**
   * Property framed
   * @readonly
   *
   * @description
   * Whether the selected variant adds a frame around the desktop sidebar.
   *
   * @type {Signal<boolean>}
   */
  private readonly framed: Signal<boolean> = computed<boolean>(
    (): boolean => this.variant() !== 'sidebar',
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Host layout classes, with normal flow reserved for the non-collapsible mode.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    this.collapsible() === 'none'
      ? cn('flex h-full w-(--sidebar-width) flex-col bg-surface-raised text-fg', this.class())
      : cn('group/sidebar peer/sidebar hidden text-fg md:block', this.class()),
  );

  /**
   * Property gapClasses
   * @readonly
   *
   * @description
   * Desktop layout spacer classes that shrink or retain icon width as the sidebar collapses.
   *
   * @type {Signal<string>}
   */
  protected readonly gapClasses: Signal<string> = computed<string>((): string =>
    cn(
      'relative w-(--sidebar-width) bg-transparent transition-[width] duration-(--dur-roll) ease-orbit motion-reduce:transition-none',
      'group-data-[collapsible=offcanvas]/sidebar:w-0',
      this.framed()
        ? 'group-data-[collapsible=icon]/sidebar:w-[calc(var(--sidebar-width-icon)+1rem)]'
        : 'group-data-[collapsible=icon]/sidebar:w-(--sidebar-width-icon)',
    ),
  );

  /**
   * Property containerClasses
   * @readonly
   *
   * @description
   * Fixed desktop sidebar positioning, width, frame and off-canvas transition classes.
   *
   * @type {Signal<string>}
   */
  protected readonly containerClasses: Signal<string> = computed<string>((): string =>
    cn(
      'fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) md:flex',
      'transition-[left,right,width,visibility] duration-(--dur-roll) ease-orbit motion-reduce:transition-none',
      'group-data-[collapsible=offcanvas]/sidebar:invisible',
      this.side() === 'left'
        ? 'left-0 group-data-[collapsible=offcanvas]/sidebar:left-[calc(var(--sidebar-width)*-1)]'
        : 'right-0 group-data-[collapsible=offcanvas]/sidebar:right-[calc(var(--sidebar-width)*-1)]',
      this.framed()
        ? 'p-2 group-data-[collapsible=icon]/sidebar:w-[calc(var(--sidebar-width-icon)+1rem+2px)]'
        : cn(
            'group-data-[collapsible=icon]/sidebar:w-(--sidebar-width-icon)',
            this.side() === 'left' ? 'border-r border-border' : 'border-l border-border',
          ),
    ),
  );

  /**
   * Property innerClasses
   * @readonly
   *
   * @description
   * Inner surface classes, including the raised border and shadow for floating sidebars.
   *
   * @type {Signal<string>}
   */
  protected readonly innerClasses: Signal<string> = computed<string>((): string =>
    cn(
      'flex h-full w-full flex-col bg-surface-raised',
      this.variant() === 'floating' && 'rounded-xl border border-border shadow-float',
    ),
  );
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Opens or closes the mobile dialog as provider state changes and disposes it on destruction.
   */
  public constructor() {
    effect((): void => {
      const mobile: boolean = this.sidebar.isMobile();
      const show: boolean = mobile && this.sidebar.openMobile() && this.collapsible() !== 'none';
      untracked((): void => {
        if (!mobile && this.sidebar.openMobile()) this.sidebar.openMobile.set(false);
        if (show) this.openDrawer();
        else this.drawerRef?.close();
      });
    });
    inject<DestroyRef>(DestroyRef).onDestroy((): void | undefined => this.drawerRef?.close());
  }
  // #endregion

  // #region Methods
  /**
   * Method openDrawer
   * @method openDrawer
   *
   * @description
   * Opens a positioned modal drawer when no drawer dialog is already active.
   * Closing the dialog clears both its reference and the provider's mobile-open state.
   *
   * @returns {void}
   */
  private openDrawer(): void {
    if (this.drawerRef) return;
    const position: GlobalPositionStrategy = createGlobalPositionStrategy(this.injector).top('0');
    const ref: DialogRef<unknown, unknown> = this.dialog.open(this.drawer(), {
      ariaLabel: this.label(),
      viewContainerRef: this.viewContainerRef,
      positionStrategy: this.side() === 'left' ? position.left('0') : position.right('0'),
      height: '100%',
      panelClass: ['h-full', 'animate-fade-up', 'motion-reduce:animate-none'],
      backdropClass: ['bg-scrim'],
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });
    this.drawerRef = ref;
    ref.closed.subscribe((): void => {
      this.drawerRef = null;
      this.sidebar.openMobile.set(false);
    });
  }
  // #endregion
}

/**
 * Component SidebarTriggerComponent
 * @class SidebarTriggerComponent
 *
 * @description
 * Labelled icon button that collapses or expands the sidebar provided under `SIDEBAR_CONTROL`
 * (`uiSidebarProvider`, or an application layout with its own sidebar), wherever it sits below the
 * provider, as shadcn's `SidebarTrigger`. Its name follows the state (« Réduire » or « Déployer la
 * barre latérale »), it reflects `aria-expanded` and `aria-controls`, and its tooltip below it shows
 * the name with the provider's shortcut caps. It renders nothing without a provider or while the
 * provider reports the toggle unavailable (a layout whose sidebar is a top bar).
 */
@Component({
  selector: 'ui-sidebar-trigger',
  imports: [ButtonDirective, NgIcon, TooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()', 'data-slot': 'sidebar-trigger' },
  template: `@if (control?.available()) {
    <button
      uiBtn
      type="button"
      variant="ghost"
      size="icon-sm"
      [attr.aria-label]="currentLabel()"
      [attr.aria-expanded]="control.expanded()"
      [attr.aria-controls]="control.controls()"
      [attr.aria-keyshortcuts]="keys().length ? modifier.ariaKeys(keys()) : null"
      [uiTooltip]="currentLabel()"
      tooltipPosition="bottom"
      [tooltipShortcut]="modifier.caps(keys())"
      (click)="control.toggle()"
    >
      <ng-icon class="rtl:-scale-x-100" [svg]="icons.panel" size="16" aria-hidden="true" />
    </button>
  }`,
})
export class SidebarTriggerComponent {
  // #region Properties
  /**
   * Property control
   * @readonly
   *
   * @description
   * Sidebar state of the nearest provider, `null` outside any provider.
   *
   * @type {SidebarControl | null}
   */
  protected readonly control: SidebarControl | null = inject<SidebarControl>(SIDEBAR_CONTROL, {
    optional: true,
  });

  /**
   * Property modifier
   * @readonly
   *
   * @description
   * Spells the shortcut caps and `aria-keyshortcuts` for the platform (`Ctrl` or `⌘`).
   *
   * @type {ModifierKeyService}
   */
  protected readonly modifier: ModifierKeyService = inject<ModifierKeyService>(ModifierKeyService);

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Panel icon shown inside the sidebar toggle button.
   *
   * @type {{ readonly panel: typeof lucidePanelLeft }}
   */
  protected readonly icons: { readonly panel: typeof lucidePanelLeft } = {
    panel: lucidePanelLeft,
  } as const;

  /**
   * Property collapseLabel
   * @readonly
   *
   * @description
   * Accessible name and tooltip while the sidebar is expanded.
   *
   * @type {InputSignal<string>}
   */
  public readonly collapseLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.sidebar.collapse:Réduire la barre latérale`,
  );

  /**
   * Property expandLabel
   * @readonly
   *
   * @description
   * Accessible name and tooltip while the sidebar is collapsed.
   *
   * @type {InputSignal<string>}
   */
  public readonly expandLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.sidebar.expand:Déployer la barre latérale`,
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes applied to the trigger host.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property currentLabel
   * @readonly
   *
   * @description
   * Name of the action the button performs in the current state.
   *
   * @type {Signal<string>}
   */
  protected readonly currentLabel: Signal<string> = computed<string>((): string =>
    this.control?.expanded() ? this.collapseLabel() : this.expandLabel(),
  );

  /**
   * Property keys
   * @readonly
   *
   * @description
   * Provider's toggle shortcut, empty without one.
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly keys: Signal<readonly string[]> = computed<readonly string[]>(
    (): readonly string[] => this.control?.shortcut() ?? [],
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Inline layout classes merged with caller-provided trigger classes; the host leaves the layout
   * (and its flex gap) while the toggle is unavailable.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(this.control?.available() ? 'inline-flex' : 'hidden', this.class()),
  );
  // #endregion
}
