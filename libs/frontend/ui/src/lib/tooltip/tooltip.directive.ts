import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import { isPlatformBrowser } from '@angular/common';
import { hasModifierKey } from '@angular/cdk/keycodes';
import {
  type OverlayRef,
  createFlexibleConnectedPositionStrategy,
  createOverlayRef,
  createRepositionScrollStrategy,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  type InputSignal,
  type Signal,
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { connectedPositions } from '@internal/ui/lib/popover/utils/connected-position/connected-position';
import type { OverlaySide } from '@internal/ui/lib/popover/models/overlay/overlay-side.type';
import { tooltipVariants } from '@internal/ui/lib/tooltip/constants/tooltip.variants';

/**
 * Component TooltipPanelComponent
 * @class TooltipPanelComponent
 *
 * @description
 * Renders tooltip text inside the overlay created by `TooltipDirective`.
 */
@Component({
  selector: 'ui-tooltip-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '{{ text() }}',
  host: { role: 'tooltip', '[id]': 'id()', '[class]': 'classes()', 'data-slot': 'tooltip-content' },
})
export class TooltipPanelComponent {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Identifier referenced by the trigger's `aria-describedby` attribute.
   *
   * @type {InputSignal<string>}
   */
  public readonly id: InputSignal<string> = input<string>('');

  /**
   * Property text
   * @readonly
   *
   * @description
   * Text content shown in the tooltip bubble.
   *
   * @type {InputSignal<string>}
   */
  public readonly text: InputSignal<string> = input<string>('');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the tooltip surface styling.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Floating bubble classes combined with caller-provided utilities.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(tooltipVariants(), this.class()),
  );
  // #endregion
}

/**
 * Directive TooltipDirective
 * @class TooltipDirective
 *
 * @description
 * Shows a short description on hover or focus and links it with `aria-describedby`. Escape, blur,
 * pointer leave and the configured hide delay close the bubble; the bubble may itself be hovered.
 */
@Directive({
  selector: '[uiTooltip]',
  exportAs: 'uiTooltip',
  host: {
    'data-slot': 'tooltip-trigger',
    '[attr.aria-describedby]': 'describedBy()',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave()',
    '(pointerdown)': 'onPointerDown()',
    '(focusin)': 'onFocus()',
    '(focusout)': 'hide()',
  },
})
export class TooltipDirective {
  // #region Properties
  /**
   * Property uiTooltip
   * @readonly
   *
   * @description
   * Required descriptive text rendered by the tooltip panel.
   *
   * @type {InputSignal<string>}
   */
  public readonly uiTooltip: InputSignal<string> = input.required<string>();

  /**
   * Property tooltipPosition
   * @readonly
   *
   * @description
   * Preferred side of the trigger where the tooltip appears.
   *
   * @type {InputSignal<OverlaySide>}
   */
  public readonly tooltipPosition: InputSignal<OverlaySide> = input<OverlaySide>('top');

  /**
   * Property tooltipShowDelay
   * @readonly
   *
   * @description
   * Milliseconds pointer hover waits before opening the tooltip.
   *
   * @type {InputSignal<number>}
   */
  public readonly tooltipShowDelay: InputSignal<number> = input<number>(500);

  /**
   * Property tooltipHideDelay
   * @readonly
   *
   * @description
   * Milliseconds the pointer may be outside before a visible tooltip closes.
   *
   * @type {InputSignal<number>}
   */
  public readonly tooltipHideDelay: InputSignal<number> = input<number>(100);

  /**
   * Property tooltipDisabled
   * @readonly
   *
   * @description
   * Whether tooltip display is suppressed while the input is enabled.
   *
   * @type {InputSignalWithTransform<boolean, boolean | '>}
   */
  public readonly tooltipDisabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property tooltipClass
   * @readonly
   *
   * @description
   * Additional utility classes applied to the floating tooltip panel.
   *
   * @type {InputSignal<string>}
   */
  public readonly tooltipClass: InputSignal<string> = input<string>('');

  /**
   * Property host
   * @readonly
   *
   * @description
   * Trigger element used as the overlay anchor and source of the existing description id.
   *
   * @type {HTMLElement}
   */
  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Injector used to create overlay strategies and the tooltip panel component.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property browser
   * @readonly
   *
   * @description
   * Whether overlays and timers can be created in the current platform.
   *
   * @type {boolean}
   */
  private readonly browser: boolean = isPlatformBrowser(inject<object>(PLATFORM_ID));

  /**
   * Property ownDescription
   * @readonly
   *
   * @description
   * Existing `aria-describedby` value retained while the tooltip is open.
   *
   * @type {string | null}
   */
  private readonly ownDescription: string | null = this.host.getAttribute('aria-describedby');

  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identifier assigned to this tooltip panel.
   *
   * @type {string}
   */
  private readonly id: string = inject<RenderIdService>(RenderIdService).next('ui-tooltip-');

  /**
   * Property panel
   * @readonly
   *
   * @description
   * Active component reference for the attached tooltip bubble, or `null` when closed.
   *
   * @type {WritableSignal<ComponentRef<TooltipPanelComponent> | null>}
   */
  private readonly panel: WritableSignal<ComponentRef<TooltipPanelComponent> | null> =
    signal<ComponentRef<TooltipPanelComponent> | null>(null);

  /**
   * Property overlayRef
   *
   * @description
   * Active CDK overlay reference associated with the tooltip panel.
   *
   * @type {OverlayRef | null}
   */
  private overlayRef: OverlayRef | null = null;

  /**
   * Property showTimer
   *
   * @description
   * Pending delayed-show timeout, when one has been scheduled.
   *
   * @type {ReturnType<typeof setTimeout> | undefined}
   */
  private showTimer?: ReturnType<typeof setTimeout>;

  /**
   * Property hideTimer
   *
   * @description
   * Pending delayed-hide timeout, when one has been scheduled.
   *
   * @type {ReturnType<typeof setTimeout> | undefined}
   */
  private hideTimer?: ReturnType<typeof setTimeout>;

  /**
   * Property pointerFocus
   *
   * @description
   * Whether pointer activation should suppress the focus event's immediate tooltip opening.
   *
   * @type {boolean}
   */
  private pointerFocus: boolean = false;

  /**
   * Property isOpen
   * @readonly
   *
   * @description
   * Whether a tooltip panel component is currently attached.
   *
   * @type {Signal<boolean>}
   */
  public readonly isOpen: Signal<boolean> = computed<boolean>((): boolean => this.panel() !== null);

  /**
   * Property describedBy
   * @readonly
   *
   * @description
   * Existing description ids combined with this tooltip id while the panel is open.
   *
   * @type {Signal<string | null>}
   */
  protected readonly describedBy: Signal<string | null> = computed<string | null>(
    (): string | null =>
      [this.ownDescription, this.isOpen() ? this.id : null].filter(Boolean).join(' ') || null,
  );
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Synchronizes a visible panel with its text and classes and closes it on directive destruction.
   */
  public constructor() {
    effect((): void => {
      const panel: ComponentRef<TooltipPanelComponent> | null = this.panel();
      const text: string = this.uiTooltip();
      const classes: string = this.tooltipClass();
      if (this.tooltipDisabled() || !text) {
        this.hide();
      } else if (panel) {
        panel.setInput('text', text);
        panel.setInput('class', classes);
      }
    });
    inject<DestroyRef>(DestroyRef).onDestroy((): void => this.hide());
  }
  // #endregion

  // #region Methods
  /**
   * Method show
   * @method show
   *
   * @description
   * Schedules or immediately attaches a panel when the tooltip is enabled and the host is in a browser.
   *
   * @param {number} delay - Milliseconds before attachment; zero opens immediately.
   * @returns {void}
   */
  public show(delay: number = this.tooltipShowDelay()): void {
    clearTimeout(this.hideTimer);
    if (!this.browser || this.overlayRef || this.tooltipDisabled() || !this.uiTooltip()) {
      return;
    }
    clearTimeout(this.showTimer);
    if (delay > 0) {
      this.showTimer = setTimeout((): void => this.attach(), delay);
    } else {
      this.attach();
    }
  }

  /**
   * Method hide
   * @method hide
   *
   * @description
   * Clears pending timers, disposes the overlay and removes the panel reference.
   *
   * @returns {void}
   */
  public hide(): void {
    clearTimeout(this.showTimer);
    clearTimeout(this.hideTimer);
    this.overlayRef?.dispose();
    this.overlayRef = null;
    this.panel.set(null);
  }

  /**
   * Method onPointerEnter
   * @method onPointerEnter
   *
   * @description
   * Starts the hover delay for non-touch pointers.
   *
   * @param {PointerEvent} event - Pointer entry event from the trigger.
   * @returns {void}
   */
  protected onPointerEnter(event: PointerEvent): void {
    if (event.pointerType !== 'touch') {
      this.show();
    }
  }

  /**
   * Method onPointerLeave
   * @method onPointerLeave
   *
   * @description
   * Clears pointer-focus suppression and schedules the tooltip to close after its hide delay.
   *
   * @returns {void}
   */
  protected onPointerLeave(): void {
    this.pointerFocus = false;
    this.scheduleHide();
  }

  /**
   * Method onPointerDown
   * @method onPointerDown
   *
   * @description
   * Closes the tooltip and marks the following focus event as pointer-driven.
   *
   * @returns {void}
   */
  protected onPointerDown(): void {
    // A click focuses the trigger: that focus must not reopen the tooltip.
    this.pointerFocus = true;
    this.hide();
  }

  /**
   * Method onFocus
   * @method onFocus
   *
   * @description
   * Opens immediately for keyboard focus unless a preceding pointer event caused the focus.
   *
   * @returns {void}
   */
  protected onFocus(): void {
    if (this.pointerFocus) {
      this.pointerFocus = false;
      return;
    }
    this.show(0);
  }

  /**
   * Method scheduleHide
   * @method scheduleHide
   *
   * @description
   * Replaces pending timers with a hide timeout using the configured leave delay.
   *
   * @returns {void}
   */
  private scheduleHide(): void {
    clearTimeout(this.showTimer);
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout((): void => this.hide(), this.tooltipHideDelay());
  }

  /**
   * Method attach
   * @method attach
   *
   * @description
   * Creates the positioned overlay, attaches the tooltip component and wires Escape and hover handling.
   *
   * @returns {void}
   */
  private attach(): void {
    const ref: OverlayRef = createOverlayRef(this.injector, {
      positionStrategy: createFlexibleConnectedPositionStrategy(this.injector, this.host)
        .withPositions(connectedPositions(this.tooltipPosition(), 'center', 6))
        .withPush(true)
        .withViewportMargin(8),
      scrollStrategy: createRepositionScrollStrategy(this.injector),
    });
    const panel: ComponentRef<TooltipPanelComponent> = ref.attach(
      new ComponentPortal(TooltipPanelComponent, null, this.injector),
    );
    panel.setInput('id', this.id);
    panel.setInput('text', this.uiTooltip());
    panel.setInput('class', this.tooltipClass());
    ref.keydownEvents().subscribe((event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !hasModifierKey(event)) {
        event.preventDefault();
        this.hide();
      }
    });

    // The bubble stays open while hovered (WCAG 1.4.13).
    ref.overlayElement.addEventListener('pointerenter', (): void => clearTimeout(this.hideTimer));
    ref.overlayElement.addEventListener('pointerleave', (): void => this.scheduleHide());
    this.overlayRef = ref;
    this.panel.set(panel);
  }
  // #endregion
}
