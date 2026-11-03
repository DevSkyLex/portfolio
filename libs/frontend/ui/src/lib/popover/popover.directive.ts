import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import { isPlatformBrowser } from '@angular/common';
import { type FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';
import { hasModifierKey } from '@angular/cdk/keycodes';
import {
  type OverlayRef,
  createFlexibleConnectedPositionStrategy,
  createOverlayRef,
  createRepositionScrollStrategy,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
  DOCUMENT,
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  PLATFORM_ID,
  TemplateRef,
  ViewContainerRef,
  afterNextRender,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { connectedPositions } from '@internal/ui/lib/popover/utils/connected-position/connected-position';
import type { OverlayAlign } from '@internal/ui/lib/popover/models/overlay/overlay-align.type';
import type { OverlaySide } from '@internal/ui/lib/popover/models/overlay/overlay-side.type';
import { popoverContentVariants } from '@internal/ui/lib/popover/constants/popover-content.variants';
import type { PopoverContext } from '@internal/ui/lib/popover/models/popover/popover-context.interface';

/**
 * Directive PopoverContentDirective
 * @class PopoverContentDirective
 *
 * @description
 * Captures a template rendered inside a non-modal popover panel and its accessible presentation inputs.
 */
@Directive({ selector: 'ng-template[uiPopoverContent]', exportAs: 'uiPopoverContent' })
export class PopoverContentDirective {
  // #region Properties
  /**
   * Property template
   * @readonly
   *
   * @description
   * Template rendered inside the overlay with a `PopoverContext` instance.
   *
   * @type {TemplateRef<PopoverContext>}
   */
  public readonly template: TemplateRef<PopoverContext> =
    inject<TemplateRef<PopoverContext>>(TemplateRef);

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes applied to the floating panel.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Optional accessible name applied to the panel's dialog role.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly ariaLabel: InputSignal<string | undefined> = input<string>();
  // #endregion

  // #region Methods
  /**
   * Method ngTemplateContextGuard
   * @method ngTemplateContextGuard
   *
   * @description
   * Narrows the template context type for Angular's template checker; it is not called at runtime.
   *
   * @param {PopoverContentDirective} directive - Directive owning the template.
   * @param {unknown} context - Context value checked by Angular's template type system.
   * @returns {context is PopoverContext} Whether the context matches the popover template contract.
   */
  public static ngTemplateContextGuard(
    directive: PopoverContentDirective,
    context: unknown,
  ): context is PopoverContext {
    // Type narrowing only: Angular never calls the guard at runtime.
    return directive !== null && context !== null;
  }
  // #endregion
}

/**
 * Directive PopoverTriggerDirective
 * @class PopoverTriggerDirective
 *
 * @description
 * Attaches a non-modal dialog panel to the host element. Opening moves focus inside; Escape closes
 * the panel and restores trigger focus, while outside interaction or focus leaving closes it without
 * stealing focus from the destination.
 */
@Directive({
  selector: '[uiPopoverTrigger]',
  exportAs: 'uiPopoverTrigger',
  host: {
    'data-slot': 'popover-trigger',
    'aria-haspopup': 'dialog',
    '[attr.aria-expanded]': 'isOpen()',
    '[attr.aria-controls]': 'isOpen() ? panelId : null',
    '[attr.data-state]': "isOpen() ? 'open' : 'closed'",
    '(click)': 'toggle()',
  },
})
export class PopoverTriggerDirective {
  // #region Properties
  /**
   * Property content
   * @readonly
   *
   * @description
   * Required template directive rendered by this trigger's overlay.
   *
   * @type {InputSignal<PopoverContentDirective>}
   */
  public readonly content: InputSignal<PopoverContentDirective> =
    input.required<PopoverContentDirective>({ alias: 'uiPopoverTrigger' });

  /**
   * Property side
   * @readonly
   *
   * @description
   * Preferred side where the panel opens relative to the trigger.
   *
   * @type {InputSignal<OverlaySide>}
   */
  public readonly side: InputSignal<OverlaySide> = input<OverlaySide>('bottom');

  /**
   * Property align
   * @readonly
   *
   * @description
   * Alignment of the panel along the preferred side.
   *
   * @type {InputSignal<OverlayAlign>}
   */
  public readonly align: InputSignal<OverlayAlign> = input<OverlayAlign>('center');

  /**
   * Property sideOffset
   * @readonly
   *
   * @description
   * Pixel gap between the trigger and its floating panel.
   *
   * @type {InputSignal<number>}
   */
  public readonly sideOffset: InputSignal<number> = input<number>(4);

  /**
   * Property openChange
   * @readonly
   *
   * @description
   * Emits `true` after opening and `false` after closing the panel.
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly openChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property panelId
   * @readonly
   *
   * @description
   * Unique identifier shared by the open panel and the trigger's `aria-controls` attribute.
   *
   * @type {string}
   */
  protected readonly panelId: string = inject<RenderIdService>(RenderIdService).next('ui-popover-');

  /**
   * Property host
   * @readonly
   *
   * @description
   * Native trigger element used as overlay anchor and focus-restoration target.
   *
   * @type {HTMLElement}
   */
  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Injector used to create CDK overlay strategies and schedule focus after rendering.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property viewContainerRef
   * @readonly
   *
   * @description
   * View container that owns the template portal attached to the overlay.
   *
   * @type {ViewContainerRef}
   */
  private readonly viewContainerRef: ViewContainerRef = inject<ViewContainerRef>(ViewContainerRef);

  /**
   * Property document
   * @readonly
   *
   * @description
   * Current document used to check active focus before moving focus into the panel.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property focusTrapFactory
   * @readonly
   *
   * @description
   * CDK helper used to locate the initial tabbable element without trapping panel focus.
   *
   * @type {FocusTrapFactory}
   */
  private readonly focusTrapFactory: FocusTrapFactory = inject<FocusTrapFactory>(FocusTrapFactory);

  /**
   * Property browser
   * @readonly
   *
   * @description
   * Whether the directive runs in a browser where overlays and focus can be managed.
   *
   * @type {boolean}
   */
  private readonly browser: boolean = isPlatformBrowser(inject<object>(PLATFORM_ID));

  /**
   * Property openState
   * @readonly
   *
   * @description
   * Internal open flag exposed through the readonly `isOpen` signal.
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly openState: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property overlayRef
   *
   * @description
   * Active CDK overlay reference, or `null` when the panel is closed.
   *
   * @type {OverlayRef | null}
   */
  private overlayRef: OverlayRef | null = null;

  /**
   * Property isOpen
   * @readonly
   *
   * @description
   * Readonly signal exposing whether this trigger currently owns an open panel.
   *
   * @type {Signal<boolean>}
   */
  public readonly isOpen: Signal<boolean> = this.openState.asReadonly();
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Disposes the active overlay when Angular destroys the trigger directive.
   */
  public constructor() {
    inject<DestroyRef>(DestroyRef).onDestroy((): void | undefined => this.overlayRef?.dispose());
  }
  // #endregion

  // #region Methods
  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Closes the active panel or opens it when no overlay is attached.
   *
   * @returns {void} Updates the overlay and open state.
   */
  public toggle(): void {
    if (this.overlayRef) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Method open
   * @method open
   *
   * @description
   * Creates and attaches the configured overlay when running in a browser and no panel is open.
   * The attached panel receives Escape, outside-pointer and focus-out close handling.
   *
   * @returns {void} Opens the panel and schedules initial focus.
   */
  public open(): void {
    if (this.overlayRef || !this.browser) {
      return;
    }
    const content: PopoverContentDirective = this.content();
    const ref: OverlayRef = createOverlayRef(this.injector, {
      positionStrategy: createFlexibleConnectedPositionStrategy(this.injector, this.host)
        .withPositions(connectedPositions(this.side(), this.align(), this.sideOffset()))
        .withPush(true)
        .withViewportMargin(8),
      scrollStrategy: createRepositionScrollStrategy(this.injector),
      panelClass: cn(popoverContentVariants(), content.class()).split(' '),
    });
    const panel: HTMLElement = ref.overlayElement;
    panel.id = this.panelId;
    panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('data-slot', 'popover-content');
    panel.setAttribute('data-side', this.side());
    const label: string | undefined = content.ariaLabel();
    if (label) {
      panel.setAttribute('aria-label', label);
    }
    ref.attach(
      new TemplatePortal(content.template, this.viewContainerRef, {
        close: (): void => this.close(),
      }),
    );
    ref.keydownEvents().subscribe((event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !hasModifierKey(event)) {
        event.preventDefault();
        this.close();
      }
    });
    ref.outsidePointerEvents().subscribe((event: MouseEvent): void => {
      // The trigger toggles on its own click.
      if (!(event.target instanceof Node && this.host.contains(event.target))) {
        this.close(false);
      }
    });
    panel.addEventListener('focusout', (event: FocusEvent): void => {
      const next: EventTarget | null = event.relatedTarget;
      if (next instanceof Node && !panel.contains(next) && !this.host.contains(next)) {
        this.close(false);
      }
    });
    this.overlayRef = ref;
    this.openState.set(true);
    this.openChange.emit(true);
    afterNextRender((): void => this.focusPanel(panel), { injector: this.injector });
  }

  /**
   * Method close
   * @method close
   *
   * @description
   * Disposes the panel and emits the closed state; focus returns to the trigger only when requested.
   *
   * @param {boolean} restoreFocus - Whether to move focus back to the trigger after disposal.
   * @returns {void} Closes an active panel; does nothing when already closed.
   */
  public close(restoreFocus: boolean = true): void {
    const ref: OverlayRef | null = this.overlayRef;
    if (!ref) {
      return;
    }
    this.overlayRef = null;
    ref.dispose();
    this.openState.set(false);
    this.openChange.emit(false);
    if (restoreFocus) {
      this.host.focus();
    }
  }

  /**
   * Method focusPanel
   * @method focusPanel
   *
   * @description
   * Focuses the panel's first tabbable element after rendering, falling back to the panel itself.
   * Stale callbacks and panels that already contain focus are ignored.
   *
   * @param {HTMLElement} panel - Overlay panel whose initial focus should be selected.
   * @returns {void} Moves focus only when the panel is still active and does not already contain it.
   */
  private focusPanel(panel: HTMLElement): void {
    if (this.overlayRef?.overlayElement !== panel || panel.contains(this.document.activeElement)) {
      return;
    }

    // Deferred anchors: only used to find the first tabbable element, focus is not trapped.
    const finder: FocusTrap = this.focusTrapFactory.create(panel, true);
    if (!finder.focusInitialElement()) {
      panel.focus();
    }
    finder.destroy();
  }
  // #endregion
}
