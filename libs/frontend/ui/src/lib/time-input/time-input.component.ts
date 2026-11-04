import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  linkedSignal,
  model,
  output,
  viewChild,
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import type { FieldHost } from '@internal/ui/lib/field/models/field/field-host.interface';
import { FIELD_HOST } from '@internal/ui/lib/field/tokens/field/field.token';
import {
  TIME_PAGE_STEP,
  TIME_SEGMENT_MAX,
} from '@internal/ui/lib/time-input/constants/time-input.constants';
import {
  type TimeInputSize,
  timeInputVariants,
} from '@internal/ui/lib/time-input/constants/time-input.variants';
import type { TimeParts } from '@internal/ui/lib/time-input/models/time-input/time-parts.interface';
import type { TimeSegment } from '@internal/ui/lib/time-input/models/time-input/time-segment.type';
import {
  formatTime,
  minuteStepAttribute,
  padSegment,
  parseTime,
  stepSegment,
} from '@internal/ui/lib/time-input/utils/time-input/time-input.utils';

/**
 * Component TimeInputComponent
 * @class TimeInputComponent
 *
 * @description
 * Edits a 24-hour time as two segments, hours and minutes, in a field-styled `role="group"` box.
 * Each segment is a native text input with `role="spinbutton"`, so a `<label for="inputId">` (or a
 * `ui-field controlId`) focuses the hours. The value is `'HH:mm'` once both segments are filled and
 * `''` while one is empty; a partial entry stays visible until it is completed or cleared.
 *
 * Keyboard of a segment: ArrowUp / ArrowDown step and wrap (by `minuteStep` on the minutes, snapping
 * a hand-typed value to the step), PageUp / PageDown jump 4 hours or 10 minutes, Home / End go to the
 * first and last value, digits type the value and the hours move on to the minutes as soon as no
 * second digit can follow (`3`, or `1` then `4`), `:` moves on as well, Backspace / Delete clear the
 * segment, ArrowLeft / ArrowRight move between the segments. Tab reaches each segment.
 *
 * Inside a `ui-field`, the group carries `aria-invalid` while the field shows its error.
 *
 * ```html
 * <ui-field label="Heure" controlId="start" [error]="error()">
 *   <ui-time-input inputId="start" ariaLabel="Heure" [minuteStep]="5" [formField]="form.start" />
 * </ui-field>
 * ```
 */
@Component({
  selector: 'ui-time-input',
  templateUrl: './time-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'group',
    'data-slot': 'time-input',
    '[class]': 'classes()',
    '[attr.aria-label]': 'ariaLabelledby() ? null : ariaLabel()',
    '[attr.aria-labelledby]': 'ariaLabelledby() ?? null',
    '[attr.aria-invalid]': 'showInvalid() || null',
    '[attr.aria-disabled]': 'disabled() || null',
    '[attr.data-disabled]': 'disabled() || null',
    '(mousedown)': 'onHostMousedown($event)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class TimeInputComponent implements FormValueControl<string> {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Time as `'HH:mm'` (24 hours), or `''` while empty or incomplete; bound by Signal Forms or
   * two-way binding. Any other text shows as two empty segments.
   *
   * @type {ModelSignal<string>}
   */
  public readonly value: ModelSignal<string> = model<string>('');

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Disables both segments.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly disabled: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property readonly
   * @readonly
   *
   * @description
   * Keeps the segments focusable and navigable while refusing every change.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly readonly: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property invalid
   * @readonly
   *
   * @description
   * Validation state bound by Signal Forms; shown once the control is touched.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly invalid: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property touched
   * @readonly
   *
   * @description
   * Whether the control was left once. Signal Forms binds it, so an empty required time turns red
   * after the field is left or the form submitted; unbound, `invalid` shows at once.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly touched: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    true,
    { transform: booleanAttribute },
  );

  /**
   * Property required
   * @readonly
   *
   * @description
   * Exposes the required state as `aria-required` on both segments (ARIA does not allow it on a
   * group).
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly required: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property minuteStep
   * @readonly
   *
   * @description
   * Minutes moved by ArrowUp / ArrowDown, an integer from 1 to 59 (1 by default); typed minutes are
   * not rounded to it.
   *
   * @type {InputSignalWithTransform<number, unknown>}
   */
  public readonly minuteStep: InputSignalWithTransform<number, unknown> = input<number, unknown>(
    1,
    { transform: minuteStepAttribute },
  );

  /**
   * Property inputId
   * @readonly
   *
   * @description
   * Id of the hours segment, the target of a label's `for`; the minutes take `<inputId>-minutes`.
   *
   * @type {InputSignal<string>}
   */
  public readonly inputId: InputSignal<string> = input<string>(
    inject<RenderIdService>(RenderIdService).next('ui-time-input-'),
  );

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Accessible name of the group, used when no `ariaLabelledby` is given.
   *
   * @type {InputSignal<string>}
   */
  public readonly ariaLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.timeInput.label:Heure`,
  );

  /**
   * Property ariaLabelledby
   * @readonly
   *
   * @description
   * Id of a visible label naming the group, which takes precedence over `ariaLabel`.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly ariaLabelledby: InputSignal<string | undefined> = input<string>();

  /**
   * Property ariaDescribedby
   * @readonly
   *
   * @description
   * Ids of the hint or error describing the time, set on both segments so it is read on focus.
   *
   * @type {InputSignal<string | null | undefined>}
   */
  public readonly ariaDescribedby: InputSignal<string | null | undefined> = input<string | null>();

  /**
   * Property hoursLabel
   * @readonly
   *
   * @description
   * Accessible name of the hours segment.
   *
   * @type {InputSignal<string>}
   */
  public readonly hoursLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.timeInput.hours:Heures`,
  );

  /**
   * Property minutesLabel
   * @readonly
   *
   * @description
   * Accessible name of the minutes segment.
   *
   * @type {InputSignal<string>}
   */
  public readonly minutesLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.timeInput.minutes:Minutes`,
  );

  /**
   * Property emptyLabel
   * @readonly
   *
   * @description
   * `aria-valuetext` of an empty segment, read instead of its `--` placeholder.
   *
   * @type {InputSignal<string>}
   */
  public readonly emptyLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.timeInput.empty:Vide`,
  );

  /**
   * Property size
   * @readonly
   *
   * @description
   * Box size, the heights and text sizes of `uiInput` (`sm` 36 px, `md` 44 px, `lg` 56 px).
   *
   * @type {InputSignal<TimeInputSize>}
   */
  public readonly size: InputSignal<TimeInputSize> = input<TimeInputSize>('md');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged onto the box (`w-auto` to fit the segments).
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property touch
   * @readonly
   *
   * @description
   * Emits when the focus leaves the control, not when it moves between the segments.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly touch: OutputEmitterRef<void> = output<void>();

  /**
   * Property segmentMax
   * @readonly
   *
   * @description
   * Largest value of each segment, bound as `aria-valuemax`.
   *
   * @type {Readonly<Record<TimeSegment, number>>}
   */
  protected readonly segmentMax: Readonly<Record<TimeSegment, number>> = TIME_SEGMENT_MAX;

  /**
   * Property parts
   * @readonly
   *
   * @description
   * Segments being edited, re-read from every new value. A value that becomes `''` keeps an
   * incomplete entry, since the control itself writes `''` while one segment is still empty.
   *
   * @type {WritableSignal<TimeParts>}
   */
  protected readonly parts: WritableSignal<TimeParts> = linkedSignal<string, TimeParts>({
    source: this.value,
    computation: (value: string, previous?: { source: string; value: TimeParts }): TimeParts =>
      value === '' && previous && formatTime(previous.value) === ''
        ? previous.value
        : parseTime(value),
  });

  /**
   * Property texts
   * @readonly
   *
   * @description
   * Two-digit text of each segment, `''` while empty (the `--` placeholder shows).
   *
   * @type {Signal<Readonly<Record<TimeSegment, string>>>}
   */
  protected readonly texts: Signal<Readonly<Record<TimeSegment, string>>> = computed<
    Readonly<Record<TimeSegment, string>>
  >(() => ({ hours: padSegment(this.parts().hours), minutes: padSegment(this.parts().minutes) }));

  /**
   * Property field
   * @readonly
   *
   * @description
   * Enclosing `ui-field`, if any.
   *
   * @type {FieldHost | null}
   */
  private readonly field: FieldHost | null = inject<FieldHost>(FIELD_HOST, { optional: true });

  /**
   * Property showInvalid
   * @readonly
   *
   * @description
   * Invalid state as displayed (`aria-invalid`): invalid and touched, or the error shown by the
   * enclosing `ui-field`.
   *
   * @type {Signal<boolean>}
   */
  public readonly showInvalid: Signal<boolean> = computed<boolean>(
    (): boolean => (this.invalid() && this.touched()) || !!this.field?.invalid(),
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Box variant merged with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(timeInputVariants({ size: this.size() }), this.class()),
  );

  /**
   * Property hours
   * @readonly
   *
   * @description
   * Hours segment.
   *
   * @type {Signal<ElementRef<HTMLInputElement>>}
   */
  private readonly hours: Signal<ElementRef<HTMLInputElement>> =
    viewChild.required<ElementRef<HTMLInputElement>>('hours');

  /**
   * Property minutes
   * @readonly
   *
   * @description
   * Minutes segment.
   *
   * @type {Signal<ElementRef<HTMLInputElement>>}
   */
  private readonly minutes: Signal<ElementRef<HTMLInputElement>> =
    viewChild.required<ElementRef<HTMLInputElement>>('minutes');

  /**
   * Property host
   * @readonly
   *
   * @description
   * Group element, used to tell a focus move between the segments from leaving the control.
   *
   * @type {HTMLElement}
   */
  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property firstDigit
   *
   * @description
   * First digit typed in a segment that can still take a second one (hours `0` to `2`, minutes `0`
   * to `5`); cleared by any other key and when the focus moves.
   *
   * @type {{ segment: TimeSegment; digit: number } | null}
   */
  private firstDigit: { segment: TimeSegment; digit: number } | null = null;
  // #endregion

  // #region Methods
  /**
   * Method focus
   * @method focus
   *
   * @description
   * Moves the focus to the hours segment.
   *
   * @param {FocusOptions} [options] - Native focus options.
   * @returns {void}
   */
  public focus(options?: FocusOptions): void {
    this.hours().nativeElement.focus(options);
  }

  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * Keyboard of a segment (see the class description). Modified keys, Tab, Enter and Escape keep
   * their native behaviour; other printable keys are refused by `onBeforeInput`.
   *
   * @param {KeyboardEvent} event - Key event of the segment.
   * @param {TimeSegment} segment - Focused segment.
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent, segment: TimeSegment): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    const key: string = event.key;
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault();
      this.focusSegment(key === 'ArrowLeft' ? 'hours' : 'minutes');
      return;
    }
    if (this.readonly()) return;
    if (/^\d$/.test(key)) {
      event.preventDefault();
      this.typeDigit(segment, Number(key));
      return;
    }
    if (key === ':' && segment === 'hours') {
      event.preventDefault();
      this.focusSegment('minutes');
      return;
    }
    const next: number | null | undefined = this.keyTarget(key, segment);
    if (next === undefined) return;
    event.preventDefault();
    this.firstDigit = null;
    this.write(segment, next);
  }

  /**
   * Method onBeforeInput
   * @method onBeforeInput
   *
   * @description
   * Keeps the native text under control: refuses every edit and applies the digits and deletions of
   * keyboards that send no usable key event (virtual keyboards report `Unidentified`).
   *
   * @param {InputEvent} event - Edit about to change the segment's text.
   * @param {TimeSegment} segment - Edited segment.
   * @returns {void}
   */
  protected onBeforeInput(event: InputEvent, segment: TimeSegment): void {
    event.preventDefault();
    if (this.readonly()) return;
    if (event.inputType.startsWith('delete')) {
      this.firstDigit = null;
      this.write(segment, null);
      return;
    }
    // Typed or pasted text: its digits are typed one after the other.
    for (const char of event.data ?? '') {
      if (/^\d$/.test(char)) this.typeDigit(this.activeSegment(segment), Number(char));
    }
  }

  /**
   * Method onSegmentFocus
   * @method onSegmentFocus
   *
   * @description
   * Forgets a first digit typed in the other segment.
   *
   * @param {TimeSegment} segment - Segment receiving the focus.
   * @returns {void}
   */
  protected onSegmentFocus(segment: TimeSegment): void {
    if (this.firstDigit?.segment !== segment) this.firstDigit = null;
  }

  /**
   * Method onHostMousedown
   * @method onHostMousedown
   *
   * @description
   * Focuses the hours when the box outside the segments (padding, separator) is pressed, without
   * letting the press blur a focused segment first.
   *
   * @param {MouseEvent} event - Press on the box.
   * @returns {void}
   */
  protected onHostMousedown(event: MouseEvent): void {
    if (event.target instanceof HTMLInputElement || this.disabled()) return;
    event.preventDefault();
    const active: Element | null = this.host.ownerDocument.activeElement;
    if (active !== this.minutes().nativeElement) this.focus();
  }

  /**
   * Method onFocusOut
   * @method onFocusOut
   *
   * @description
   * Reports the touch when the focus leaves the control, not when it moves between the segments.
   *
   * @param {FocusEvent} event - Focus-out event bubbling to the group.
   * @returns {void}
   */
  protected onFocusOut(event: FocusEvent): void {
    const next: EventTarget | null = event.relatedTarget;
    if (next instanceof Node && this.host.contains(next)) return;
    this.firstDigit = null;
    this.touch.emit();
  }

  /**
   * Method keyTarget
   * @method keyTarget
   *
   * @description
   * Value a stepping or clearing key gives the segment.
   *
   * @param {string} key - Key of the event.
   * @param {TimeSegment} segment - Focused segment.
   * @returns {number | null | undefined} The new value, `null` to clear, `undefined` for another key.
   */
  private keyTarget(key: string, segment: TimeSegment): number | null | undefined {
    const value: number | null = this.parts()[segment];
    const max: number = TIME_SEGMENT_MAX[segment];
    const step: number = segment === 'minutes' ? this.minuteStep() : 1;
    const page: number = Math.ceil(TIME_PAGE_STEP[segment] / step);
    switch (key) {
      case 'ArrowUp':
        return stepSegment(value, 1, step, max);
      case 'ArrowDown':
        return stepSegment(value, -1, step, max);
      case 'PageUp':
        return stepSegment(value, page, step, max);
      case 'PageDown':
        return stepSegment(value, -page, step, max);
      case 'Home':
        return 0;
      case 'End':
        return stepSegment(null, -1, step, max);
      case 'Backspace':
      case 'Delete':
        return null;
      default:
        return undefined;
    }
  }

  /**
   * Method typeDigit
   * @method typeDigit
   *
   * @description
   * Types a digit: completes the first digit kept for the segment when the two make a valid value,
   * else starts a new value. The hours then move on to the minutes unless a second digit can follow.
   *
   * @param {TimeSegment} segment - Typed segment.
   * @param {number} digit - Digit from 0 to 9.
   * @returns {void}
   */
  private typeDigit(segment: TimeSegment, digit: number): void {
    const max: number = TIME_SEGMENT_MAX[segment];
    const first: number | null =
      this.firstDigit?.segment === segment ? this.firstDigit.digit : null;
    const combined: number = (first ?? 0) * 10 + digit;
    if (first !== null && combined <= max) {
      this.firstDigit = null;
      this.write(segment, combined);
    } else {
      // A digit can take a second one while it times 10 stays within the segment (2 for 23, 5 for 59).
      const waits: boolean = digit * 10 <= max;
      this.firstDigit = waits ? { segment, digit } : null;
      this.write(segment, digit);
      if (waits) return;
    }
    if (segment === 'hours') this.focusSegment('minutes');
  }

  /**
   * Method write
   * @method write
   *
   * @description
   * Sets one segment and publishes the resulting value (`''` while a segment is empty).
   *
   * @param {TimeSegment} segment - Changed segment.
   * @param {number | null} next - New segment value.
   * @returns {void}
   */
  private write(segment: TimeSegment, next: number | null): void {
    const parts: TimeParts = { ...this.parts(), [segment]: next };
    this.parts.set(parts);
    this.value.set(formatTime(parts));
  }

  /**
   * Method focusSegment
   * @method focusSegment
   *
   * @description
   * Moves the focus to a segment.
   *
   * @param {TimeSegment} segment - Segment to focus.
   * @returns {void}
   */
  private focusSegment(segment: TimeSegment): void {
    (segment === 'hours' ? this.hours() : this.minutes()).nativeElement.focus();
  }

  /**
   * Method activeSegment
   * @method activeSegment
   *
   * @description
   * Segment holding the focus, which changes while a pasted text is typed digit by digit.
   *
   * @param {TimeSegment} fallback - Segment of the event, when the focus is elsewhere.
   * @returns {TimeSegment} The focused segment.
   */
  private activeSegment(fallback: TimeSegment): TimeSegment {
    const active: Element | null = this.host.ownerDocument.activeElement;
    if (active === this.hours().nativeElement) return 'hours';
    if (active === this.minutes().nativeElement) return 'minutes';
    return fallback;
  }
  // #endregion
}
