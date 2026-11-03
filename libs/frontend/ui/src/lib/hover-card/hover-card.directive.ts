import { isPlatformBrowser } from '@angular/common';
import { hasModifierKey } from '@angular/cdk/keycodes';
import {
  type OverlayRef,
  createFlexibleConnectedPositionStrategy,
  createOverlayRef,
  createRepositionScrollStrategy,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  PLATFORM_ID,
  TemplateRef,
  ViewContainerRef,
  inject,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { connectedPositions } from '@internal/ui/lib/popover/utils/connected-position/connected-position';
import type { OverlayAlign } from '@internal/ui/lib/popover/models/overlay/overlay-align.type';
import type { OverlaySide } from '@internal/ui/lib/popover/models/overlay/overlay-side.type';
import { hoverCardContentVariants } from '@internal/ui/lib/hover-card/constants/hover-card-content.variants';

/**
 * Class HoverCardContentDirective
 * @class HoverCardContentDirective
 *
 * @description
 * Exposes a template and optional classes for the preview panel attached by a hover-card trigger.
 */
@Directive({ selector: 'ng-template[uiHoverCardContent]', exportAs: 'uiHoverCardContent' })
export class HoverCardContentDirective {
  // #region Properties
  /**
   * Property template
   * @readonly
   *
   * @description
   * Content template instantiated inside the connected overlay.
   *
   * @type {TemplateRef<unknown>}
   */
  public readonly template: TemplateRef<unknown> = inject<TemplateRef<unknown>>(TemplateRef);

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the shared preview panel treatment.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');
  // #endregion
}

/**
 * Class HoverCardTriggerDirective
 * @class HoverCardTriggerDirective
 *
 * @description
 * Shows a rich non-essential preview after a delayed pointer hover or immediately on keyboard focus.
 * It ignores touch pointers and closes when the trigger/card are left, focus leaves both, or Escape
 * is pressed.
 */
@Directive({
  selector: '[uiHoverCardTrigger]',
  exportAs: 'uiHoverCardTrigger',
  host: {
    'data-slot': 'hover-card-trigger',
    '[attr.data-state]': "isOpen() ? 'open' : 'closed'",
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'scheduleClose()',
    '(focusin)': 'open(0)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class HoverCardTriggerDirective {
  // #region Properties
  /**
   * Property content
   * @readonly
   *
   * @description
   * Required template directive rendered as the hover-card panel.
   *
   * @type {InputSignal<HoverCardContentDirective>}
   */
  public readonly content: InputSignal<HoverCardContentDirective> =
    input.required<HoverCardContentDirective>({
      alias: 'uiHoverCardTrigger',
    });

  /**
   * Property side
   * @readonly
   *
   * @description
   * Preferred side of the trigger for placing the preview overlay.
   *
   * @type {InputSignal<OverlaySide>}
   */
  public readonly side: InputSignal<OverlaySide> = input<OverlaySide>('bottom');

  /**
   * Property align
   * @readonly
   *
   * @description
   * Alignment of the preview relative to the trigger on its selected side.
   *
   * @type {InputSignal<OverlayAlign>}
   */
  public readonly align: InputSignal<OverlayAlign> = input<OverlayAlign>('center');

  /**
   * Property sideOffset
   * @readonly
   *
   * @description
   * Pixel distance between the trigger and the preview overlay.
   *
   * @type {InputSignal<number>}
   */
  public readonly sideOffset: InputSignal<number> = input<number>(8);

  /**
   * Property openDelay
   * @readonly
   *
   * @description
   * Pointer-hover delay before attaching the panel, in milliseconds; focus opens immediately.
   *
   * @type {InputSignal<number>}
   */
  public readonly openDelay: InputSignal<number> = input<number>(700);

  /**
   * Property closeDelay
   * @readonly
   *
   * @description
   * Delay before closing after the pointer leaves the trigger or panel, in milliseconds.
   *
   * @type {InputSignal<number>}
   */
  public readonly closeDelay: InputSignal<number> = input<number>(300);

  /**
   * Property openChange
   * @readonly
   *
   * @description
   * Emits the overlay's open state after attachment or disposal.
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly openChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property host
   * @readonly
   *
   * @description
   * Trigger element used as the overlay origin and focus boundary.
   *
   * @type {HTMLElement}
   */
  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Injection context used to construct the connected overlay and its position strategy.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property viewContainerRef
   * @readonly
   *
   * @description
   * Container that owns the embedded preview template view.
   *
   * @type {ViewContainerRef}
   */
  private readonly viewContainerRef: ViewContainerRef = inject<ViewContainerRef>(ViewContainerRef);

  /**
   * Property browser
   * @readonly
   *
   * @description
   * Guards overlay and timer behavior from running during server rendering.
   *
   * @type {boolean}
   */
  private readonly browser: boolean = isPlatformBrowser(inject<object>(PLATFORM_ID));

  /**
   * Property openState
   * @readonly
   *
   * @description
   * Internal overlay visibility state exposed through the read-only `isOpen` signal.
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly openState: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property overlayRef
   *
   * @description
   * Active overlay handle, or null after its panel has been disposed.
   *
   * @type {OverlayRef | null}
   */
  private overlayRef: OverlayRef | null = null;

  /**
   * Property openTimer
   *
   * @description
   * Pending delayed-open timeout cancelled when the pointer leaves or the panel closes.
   *
   * @type {ReturnType<typeof setTimeout> | undefined}
   */
  private openTimer?: ReturnType<typeof setTimeout>;

  /**
   * Property closeTimer
   *
   * @description
   * Pending delayed-close timeout cancelled when the pointer enters the trigger or panel.
   *
   * @type {ReturnType<typeof setTimeout> | undefined}
   */
  private closeTimer?: ReturnType<typeof setTimeout>;

  /**
   * Property isOpen
   * @readonly
   *
   * @description
   * Read-only visibility signal used by the trigger's data-state attribute.
   *
   * @type {Signal<boolean>}
   */
  public readonly isOpen: Signal<boolean> = this.openState.asReadonly();

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Disposes the overlay and pending timers when the trigger directive is destroyed.
   */
  public constructor() {
    inject<DestroyRef>(DestroyRef).onDestroy(() => this.close());
  }
  // #endregion

  // #region Methods
  /**
   * Method open
   * @method open
   *
   * @description
   * Schedules panel attachment after the configured delay, or attaches immediately when called from
   * keyboard focus.
   *
   * @param {number} delay - Opening delay in milliseconds.
   * @returns {void} Completes after scheduling or attaching the panel.
   */
  public open(delay: number = this.openDelay()): void {
    clearTimeout(this.closeTimer);
    if (!this.browser || this.overlayRef) {
      return;
    }
    clearTimeout(this.openTimer);
    if (delay > 0) {
      this.openTimer = setTimeout(() => this.attach(), delay);
    } else {
      this.attach();
    }
  }

  /**
   * Method close
   * @method close
   *
   * @description
   * Cancels pending timeouts, disposes the active panel and emits the closed state.
   *
   * @returns {void} Completes after disposal when an overlay is attached.
   */
  public close(): void {
    clearTimeout(this.openTimer);
    clearTimeout(this.closeTimer);
    const ref: OverlayRef | null = this.overlayRef;
    if (!ref) {
      return;
    }
    this.overlayRef = null;
    ref.dispose();
    this.openState.set(false);
    this.openChange.emit(false);
  }

  /**
   * Method onPointerEnter
   * @method onPointerEnter
   *
   * @description
   * Starts the hover delay for non-touch pointer devices while leaving touch activation to the host.
   *
   * @param {PointerEvent} event - Pointer entering the trigger.
   * @returns {void} Completes after scheduling open for non-touch pointers.
   */
  protected onPointerEnter(event: PointerEvent): void {
    if (event.pointerType !== 'touch') {
      this.open();
    }
  }

  /**
   * Method scheduleClose
   * @method scheduleClose
   *
   * @description
   * Replaces pending timers with a delayed close after the pointer leaves an interactive region.
   *
   * @returns {void} Completes after scheduling the delayed close.
   */
  protected scheduleClose(): void {
    clearTimeout(this.openTimer);
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => this.close(), this.closeDelay());
  }

  /**
   * Method onFocusOut
   * @method onFocusOut
   *
   * @description
   * Keeps the preview open when focus moves into its panel and closes it when focus leaves both.
   *
   * @param {FocusEvent} event - Focus transition from the trigger host.
   * @returns {void} Completes after preserving or closing the preview based on the focus target.
   */
  protected onFocusOut(event: FocusEvent): void {
    const next: EventTarget | null = event.relatedTarget;
    const card: HTMLElement | undefined = this.overlayRef?.overlayElement;
    if (!(next instanceof Node && card?.contains(next))) {
      this.close();
    }
  }

  /**
   * Method attach
   * @method attach
   *
   * @description
   * Creates and positions the connected panel, wires pointer/focus/Escape closure and publishes the
   * open state after attaching the content template.
   *
   * @returns {void} Completes after attaching the panel and publishing its open state.
   */
  private attach(): void {
    const content: HoverCardContentDirective = this.content();
    const ref: OverlayRef = createOverlayRef(this.injector, {
      positionStrategy: createFlexibleConnectedPositionStrategy(this.injector, this.host)
        .withPositions(connectedPositions(this.side(), this.align(), this.sideOffset()))
        .withPush(true)
        .withViewportMargin(8),
      scrollStrategy: createRepositionScrollStrategy(this.injector),
      panelClass: cn(hoverCardContentVariants(), content.class()).split(' '),
    });
    const card: HTMLElement = ref.overlayElement;
    card.setAttribute('data-slot', 'hover-card-content');
    card.setAttribute('data-side', this.side());
    ref.attach(new TemplatePortal(content.template, this.viewContainerRef));
    ref.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape' && !hasModifierKey(event)) {
        event.preventDefault();
        this.close();
      }
    });
    card.addEventListener('pointerenter', () => clearTimeout(this.closeTimer));
    card.addEventListener('pointerleave', () => this.scheduleClose());
    card.addEventListener('focusout', (event) => {
      const next: EventTarget | null = event.relatedTarget;
      if (!(next instanceof Node && (card.contains(next) || this.host.contains(next)))) {
        this.close();
      }
    });
    this.overlayRef = ref;
    this.openState.set(true);
    this.openChange.emit(true);
  }
  // #endregion
}
