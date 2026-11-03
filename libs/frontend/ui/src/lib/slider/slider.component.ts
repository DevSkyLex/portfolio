import { _IdGenerator } from '@angular/cdk/a11y';
import { Directionality } from '@angular/cdk/bidi';
import {
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type OutputEmitterRef,
  type Signal,
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  numberAttribute,
  output,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { decimals, optionalNumber } from '@internal/ui/lib/slider/utils/slider/slider.utils';

/**
 * Component SliderComponent
 * @class SliderComponent
 *
 * @description
 * Implements a single-thumb slider with keyboard and pointer interaction, normalized bounds and
 * Signal Forms integration. Arrow keys change by one step, Page Up/Down by ten steps, and Home/End
 * select the bounds.
 */
@Component({
  selector: 'ui-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './slider.component.html',
  host: {
    'data-slot': 'slider',
    '[class]': 'classes()',
    '[attr.data-disabled]': 'disabled() || null',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerUp($event)',
  },
})
export class SliderComponent implements FormValueControl<number> {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Two-way slider value model, updated after the requested value is snapped and clamped.
   *
   * @type {ModelSignal<number>}
   */
  public readonly value: ModelSignal<number> = model<number>(0);

  /**
   * Property min
   * @readonly
   *
   * @description
   * Optional lower bound; empty Signal Forms values remain absent and render as zero.
   *
   * @type {InputSignalWithTransform<number | undefined, unknown>}
   */
  public readonly min: InputSignalWithTransform<number | undefined, unknown> = input<
    number | undefined,
    unknown
  >(0, { transform: optionalNumber });

  /**
   * Property max
   * @readonly
   *
   * @description
   * Optional upper bound; empty Signal Forms values remain absent and render as 100.
   *
   * @type {InputSignalWithTransform<number | undefined, unknown>}
   */
  public readonly max: InputSignalWithTransform<number | undefined, unknown> = input<
    number | undefined,
    unknown
  >(100, { transform: optionalNumber });

  /**
   * Property step
   * @readonly
   *
   * @description
   * Requested increment between snapped values; non-positive values fall back to one.
   *
   * @type {InputSignalWithTransform<number, unknown>}
   */
  public readonly step: InputSignalWithTransform<number, unknown> = input<number, unknown>(1, {
    transform: numberAttribute,
  });

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Whether pointer and keyboard value changes are disabled.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly disabled: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    {
      transform: booleanAttribute,
    },
  );

  /**
   * Property invalid
   * @readonly
   *
   * @description
   * Invalid state reflected on the thumb and its visual focus treatment.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly invalid: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    {
      transform: booleanAttribute,
    },
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes applied to the slider host.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property controlId
   * @readonly
   *
   * @description
   * Id applied to the thumb and usable as an external label target.
   *
   * @type {InputSignal<string>}
   */
  public readonly controlId: InputSignal<string> = input<string>(
    inject<_IdGenerator>(_IdGenerator).getId('ui-slider-'),
  );

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Optional accessible name for the slider thumb.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly ariaLabel: InputSignal<string | undefined> = input<string>();

  /**
   * Property ariaLabelledby
   * @readonly
   *
   * @description
   * Optional id reference to the element naming the slider.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly ariaLabelledby: InputSignal<string | undefined> = input<string>();

  /**
   * Property ariaDescribedby
   * @readonly
   *
   * @description
   * Optional id reference to descriptive text for the slider.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly ariaDescribedby: InputSignal<string | undefined> = input<string>();

  /**
   * Property valueText
   * @readonly
   *
   * @description
   * Optional formatter for `aria-valuetext` when the numeric value needs contextual meaning.
   *
   * @type {InputSignal<((value: number) => string) | undefined>}
   */
  public readonly valueText: InputSignal<((value: number) => string) | undefined> =
    input<(value: number) => string>();

  /**
   * Property touch
   * @readonly
   *
   * @description
   * Emits when the thumb loses focus so Signal Forms can mark the field touched.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly touch: OutputEmitterRef<void> = output<void>();

  /**
   * Property lower
   * @readonly
   *
   * @description
   * Effective lower bound, falling back to zero when no minimum is provided.
   *
   * @type {Signal<number>}
   */
  protected readonly lower: Signal<number> = computed<number>((): number => this.min() ?? 0);

  /**
   * Property upper
   * @readonly
   *
   * @description
   * Effective upper bound, never lower than the effective minimum.
   *
   * @type {Signal<number>}
   */
  protected readonly upper: Signal<number> = computed<number>((): number =>
    Math.max(this.max() ?? 100, this.lower()),
  );

  /**
   * Property current
   * @readonly
   *
   * @description
   * Displayed value clamped to the effective lower and upper bounds.
   *
   * @type {Signal<number>}
   */
  protected readonly current: Signal<number> = computed<number>((): number =>
    Math.min(Math.max(this.value(), this.lower()), this.upper()),
  );

  /**
   * Property percent
   * @readonly
   *
   * @description
   * Thumb position as a percentage of the effective range; a zero-width range stays at zero.
   *
   * @type {Signal<number>}
   */
  protected readonly percent: Signal<number> = computed<number>((): number => {
    const span: number = this.upper() - this.lower();
    return span === 0 ? 0 : ((this.current() - this.lower()) / span) * 100;
  });

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Track layout classes with disabled interaction styling and caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'relative flex h-5 w-full cursor-pointer touch-none items-center select-none',
      'data-disabled:cursor-not-allowed data-disabled:opacity-50',
      this.class(),
    ),
  );

  /**
   * Property thumbClasses
   * @readonly
   *
   * @description
   * Thumb surface, focus, hover and validation classes.
   *
   * @type {Signal<string>}
   */
  protected readonly thumbClasses: Signal<string> = computed<string>((): string =>
    cn(
      'absolute top-1/2 block size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-star bg-void rtl:translate-x-1/2',
      'transition-[border-color,outline-color,scale] duration-(--dur-pop) ease-orbit motion-reduce:transition-none',
      'outline-4 outline-offset-0 outline-transparent focus-visible:border-signal focus-visible:outline-signal/12',
      !this.disabled() && 'hover:scale-110',
      this.invalid() && 'border-danger focus-visible:border-danger focus-visible:outline-danger/12',
    ),
  );

  /**
   * Property rtl
   * @readonly
   *
   * @description
   * Whether horizontal interaction direction is reversed by the current text direction.
   *
   * @type {boolean}
   */
  private readonly rtl: boolean = inject<Directionality>(Directionality).value === 'rtl';

  /**
   * Property track
   * @readonly
   *
   * @description
   * Required track element used to translate pointer coordinates into values.
   *
   * @type {Signal<ElementRef<HTMLElement>>}
   */
  private readonly track: Signal<ElementRef<HTMLElement>> =
    viewChild.required<ElementRef<HTMLElement>>('track');

  /**
   * Property thumb
   * @readonly
   *
   * @description
   * Required thumb element used for focus management.
   *
   * @type {Signal<ElementRef<HTMLElement>>}
   */
  private readonly thumb: Signal<ElementRef<HTMLElement>> =
    viewChild.required<ElementRef<HTMLElement>>('thumb');

  /**
   * Property dragging
   *
   * @description
   * Whether the pointer is currently captured for a drag gesture.
   *
   * @type {boolean}
   */
  private dragging: boolean = false;
  // #endregion

  // #region Methods
  /**
   * Method focus
   * @method focus
   *
   * @description
   * Moves focus to the slider thumb.
   *
   * @param {FocusOptions} options - Native focus options forwarded to the thumb.
   * @returns {void}
   */
  public focus(options?: FocusOptions): void {
    this.thumb().nativeElement.focus(options);
  }

  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * Changes the slider value for supported arrow, page and boundary keys when enabled.
   * Horizontal arrows account for right-to-left direction; vertical arrows retain natural direction.
   *
   * @param {KeyboardEvent} event - Keyboard event from the thumb.
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) {
      return;
    }
    const step: number = this.stepSize();
    const forward: number = this.rtl ? -step : step;
    const targets: Partial<Record<string, number>> = {
      ArrowRight: this.current() + forward,
      ArrowLeft: this.current() - forward,
      ArrowUp: this.current() + step,
      ArrowDown: this.current() - step,
      PageUp: this.current() + step * 10,
      PageDown: this.current() - step * 10,
      Home: this.lower(),
      End: this.upper(),
    };
    const target: number | undefined = targets[event.key];
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    this.setValue(target);
  }

  /**
   * Method onPointerDown
   * @method onPointerDown
   *
   * @description
   * Starts a primary-button drag, updates the value at the pressed position and focuses the thumb.
   *
   * @param {PointerEvent} event - Pointer press on the slider host.
   * @returns {void}
   */
  protected onPointerDown(event: PointerEvent): void {
    if (this.disabled() || event.button !== 0) {
      return;
    }
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.dragging = true;
    this.setValueFromPointer(event.clientX);
    this.focus();
  }

  /**
   * Method onPointerMove
   * @method onPointerMove
   *
   * @description
   * Updates the slider value from pointer position while a drag is active.
   *
   * @param {PointerEvent} event - Pointer movement during the active drag.
   * @returns {void}
   */
  protected onPointerMove(event: PointerEvent): void {
    if (this.dragging) {
      this.setValueFromPointer(event.clientX);
    }
  }

  /**
   * Method onPointerUp
   * @method onPointerUp
   *
   * @description
   * Ends the active drag and releases pointer capture.
   *
   * @param {PointerEvent} event - Pointer release or cancellation event.
   * @returns {void}
   */
  protected onPointerUp(event: PointerEvent): void {
    if (this.dragging) {
      this.dragging = false;
      (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    }
  }

  /**
   * Method stepSize
   * @method stepSize
   *
   * @description
   * Returns a usable positive step for keyboard and pointer value snapping.
   *
   * @returns {number} Configured positive step, or one for a non-positive input.
   */
  private stepSize(): number {
    const step: number = this.step();
    return step > 0 ? step : 1;
  }

  /**
   * Method setValueFromPointer
   * @method setValueFromPointer
   *
   * @description
   * Maps the pointer's horizontal location across the track to the effective value range.
   *
   * @param {number} clientX - Pointer coordinate in viewport pixels.
   * @returns {void}
   */
  private setValueFromPointer(clientX: number): void {
    const rect: DOMRect = this.track().nativeElement.getBoundingClientRect();
    if (rect.width === 0) {
      return;
    }
    const ratio: number = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    this.setValue(this.lower() + (this.rtl ? 1 - ratio : ratio) * (this.upper() - this.lower()));
  }

  /**
   * Method setValue
   * @method setValue
   *
   * @description
   * Snaps a raw value to the step grid starting at the lower bound, rounds away floating-point
   * artifacts, clamps to the range and emits only when the value changes.
   *
   * @param {number} raw - Requested value before snapping.
   * @returns {void}
   */
  private setValue(raw: number): void {
    const step: number = this.stepSize();
    const lower: number = this.lower();
    const snapped: number = lower + Math.round((raw - lower) / step) * step;
    const rounded: number = Number(snapped.toFixed(Math.max(decimals(step), decimals(lower))));
    const next: number = Math.min(Math.max(rounded, lower), this.upper());
    if (next !== this.value()) {
      this.value.set(next);
    }
  }
  // #endregion
}
