import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  type ConnectedPosition,
} from '@angular/cdk/overlay';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  Injector,
  LOCALE_ID,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  viewChild,
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { NgIcon } from '@ng-icons/core';
import { lucideCalendar } from '@ng-icons/lucide';
import { ButtonDirective } from '@internal/ui/lib/button/button.directive';
import { CalendarComponent } from '@internal/ui/lib/calendar/calendar.component';
import type { Weekday } from '@internal/ui/lib/calendar/models/calendar/weekday.type';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { POSITIONS } from '@internal/ui/lib/date-picker/constants/date-picker.constants';
import {
  isCompleteTime,
  timeOf,
  withTime,
} from '@internal/ui/lib/date-time-picker/utils/date-time-picker/date-time-picker.utils';
import type { FieldHost } from '@internal/ui/lib/field/models/field/field-host.interface';
import { FIELD_HOST } from '@internal/ui/lib/field/tokens/field/field.token';
import { type InputSize, inputVariants } from '@internal/ui/lib/input/constants/input.variants';
import { TimeInputComponent } from '@internal/ui/lib/time-input/time-input.component';
import { minuteStepAttribute } from '@internal/ui/lib/time-input/utils/time-input/time-input.utils';

/**
 * Component DateTimePickerComponent
 * @class DateTimePickerComponent
 *
 * @description
 * Signal Forms date-and-time control: the field-styled trigger of `ui-date-picker` opens the same
 * calendar dialog in a CDK overlay, with a bottom bar holding a `ui-time-input` and a « Valider »
 * button that closes it. Picking a day sets the value to that day at the time shown (or
 * `defaultTime` while it is incomplete) and keeps the dialog open; editing the time updates the value
 * once a day is set. Escape and outside interaction close the dialog; focus restoration respects a
 * user's subsequent focus movement, as in `ui-date-picker`.
 *
 * The bounds are `minDate` / `maxDate`, not `min` / `max`: Signal Forms reserves those names for its
 * own `min()` / `max()` rules and refuses binding them beside `[formField]`. They bound the days only;
 * the time is not clamped.
 *
 * ```html
 * <ui-field label="Rendez-vous" controlId="meeting" [error]="error()">
 *   <ui-date-time-picker triggerId="meeting" [minuteStep]="15" [formField]="form.meeting" />
 * </ui-field>
 * ```
 */
@Component({
  selector: 'ui-date-time-picker',
  imports: [
    ButtonDirective,
    CalendarComponent,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    CdkTrapFocus,
    NgIcon,
    TimeInputComponent,
  ],
  templateUrl: './date-time-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    'data-slot': 'date-time-picker',
    '[attr.data-state]': 'open() ? "open" : "closed"',
  },
  // The field's error belongs to the trigger: the time input of the dialog does not turn red with it.
  viewProviders: [{ provide: FIELD_HOST, useValue: null }],
})
export class DateTimePickerComponent implements FormValueControl<Date | null> {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Selected local date and time, bound to the Signal Forms control contract.
   *
   * @type {ModelSignal<Date | null>}
   */
  public readonly value: ModelSignal<Date | null> = model<Date | null>(null);

  /**
   * Property minDate
   * @readonly
   *
   * @description
   * Earliest selectable day, inclusive (see the class description for the name).
   *
   * @type {InputSignal<Date | undefined>}
   */
  public readonly minDate: InputSignal<Date | undefined> = input<Date | undefined>();

  /**
   * Property maxDate
   * @readonly
   *
   * @description
   * Latest selectable day, inclusive (see the class description for the name).
   *
   * @type {InputSignal<Date | undefined>}
   */
  public readonly maxDate: InputSignal<Date | undefined> = input<Date | undefined>();

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Disables opening and interaction with the picker; accepts a native empty boolean attribute.
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
   * Prevents choosing a new value while retaining a focusable trigger that displays the current one.
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
   * Validation state bound by Signal Forms; shown on the trigger once the control is touched.
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
   * Whether the control was left once. Signal Forms binds it, so an empty required value turns red
   * after the trigger is left or the dialog closed; unbound, `invalid` shows at once.
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
   * Exposes the required state as `aria-required` on the trigger.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly required: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property dateDisabled
   * @readonly
   *
   * @description
   * Optional predicate for days unavailable beyond `minDate` and `maxDate`.
   *
   * @type {InputSignal<((date: Date) => boolean) | undefined>}
   */
  public readonly dateDisabled: InputSignal<((date: Date) => boolean) | undefined> =
    input<(date: Date) => boolean>();

  /**
   * Property weekStartsOn
   * @readonly
   *
   * @description
   * Optional weekday used as the first column in the embedded calendar.
   *
   * @type {InputSignal<Weekday | undefined>}
   */
  public readonly weekStartsOn: InputSignal<Weekday | undefined> = input<Weekday>();

  /**
   * Property defaultTime
   * @readonly
   *
   * @description
   * `HH:mm` time given to a day picked while the time input is incomplete; an invalid value gives
   * midnight.
   *
   * @type {InputSignal<string>}
   */
  public readonly defaultTime: InputSignal<string> = input<string>('09:00');

  /**
   * Property minuteStep
   * @readonly
   *
   * @description
   * Minutes moved by ArrowUp / ArrowDown in the time input, an integer from 1 to 59.
   *
   * @type {InputSignalWithTransform<number, unknown>}
   */
  public readonly minuteStep: InputSignalWithTransform<number, unknown> = input<number, unknown>(
    1,
    { transform: minuteStepAttribute },
  );

  /**
   * Property format
   * @readonly
   *
   * @description
   * Locale-aware formatting options for the value displayed by the trigger.
   *
   * @type {InputSignal<Intl.DateTimeFormatOptions>}
   */
  public readonly format: InputSignal<Intl.DateTimeFormatOptions> =
    input<Intl.DateTimeFormatOptions>({ dateStyle: 'long', timeStyle: 'short' });

  /**
   * Property placeholder
   * @readonly
   *
   * @description
   * Localized trigger text displayed when no value has been selected.
   *
   * @type {InputSignal<string>}
   */
  public readonly placeholder: InputSignal<string> = input<string>(
    $localize`:@@ui.dateTimePicker.placeholder:Choisir une date et une heure`,
  );

  /**
   * Property dialogLabel
   * @readonly
   *
   * @description
   * Accessible name applied to the dialog.
   *
   * @type {InputSignal<string>}
   */
  public readonly dialogLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.dateTimePicker.dialog:Choisir une date et une heure`,
  );

  /**
   * Property timeLabel
   * @readonly
   *
   * @description
   * Visible label of the time input, which also names its group.
   *
   * @type {InputSignal<string>}
   */
  public readonly timeLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.dateTimePicker.time:Heure`,
  );

  /**
   * Property confirmLabel
   * @readonly
   *
   * @description
   * Text of the button closing the dialog.
   *
   * @type {InputSignal<string>}
   */
  public readonly confirmLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.dateTimePicker.confirm:Valider`,
  );

  /**
   * Property triggerId
   * @readonly
   *
   * @description
   * Trigger identifier used by an external label and as the basis for the dialog ids.
   *
   * @type {InputSignal<string>}
   */
  public readonly triggerId: InputSignal<string> = input<string>(
    inject<RenderIdService>(RenderIdService).next('ui-date-time-picker-'),
  );

  /**
   * Property describedBy
   * @readonly
   *
   * @description
   * Optional id list of descriptive text associated with the trigger.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly describedBy: InputSignal<string | undefined> = input<string>();

  /**
   * Property size
   * @readonly
   *
   * @description
   * Shared input size variant applied to the trigger.
   *
   * @type {InputSignal<InputSize>}
   */
  public readonly size: InputSignal<InputSize> = input<InputSize>('md');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional wrapper classes merged with the full-width picker layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property touch
   * @readonly
   *
   * @description
   * Emits when the user leaves the closed trigger or closes the dialog.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly touch: OutputEmitterRef<void> = output<void>();

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Calendar icon definition used by the trigger template.
   *
   * @type {{ readonly calendar: typeof lucideCalendar }}
   */
  protected readonly icons: { readonly calendar: typeof lucideCalendar } = {
    calendar: lucideCalendar,
  } as const;

  /**
   * Property positions
   * @readonly
   *
   * @description
   * Overlay placements of `ui-date-picker`.
   *
   * @type {ConnectedPosition[]}
   */
  protected readonly positions: ConnectedPosition[] = POSITIONS;

  /**
   * Property open
   * @readonly
   *
   * @description
   * Whether the dialog overlay is currently attached.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly open: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property time
   * @readonly
   *
   * @description
   * Time shown by the time input: the value's time, or what the user set before picking a day
   * (`''` while incomplete).
   *
   * @type {WritableSignal<string>}
   */
  protected readonly time: WritableSignal<string> = linkedSignal<string>(() =>
    timeOf(this.value()),
  );

  /**
   * Property dialogId
   * @readonly
   *
   * @description
   * Dialog identifier derived from the trigger id for accessible trigger relationships.
   *
   * @type {Signal<string>}
   */
  protected readonly dialogId: Signal<string> = computed<string>(
    () => `${this.triggerId()}-dialog`,
  );

  /**
   * Property timeId
   * @readonly
   *
   * @description
   * Id of the time input's hours segment, the target of the « Heure » label.
   *
   * @type {Signal<string>}
   */
  protected readonly timeId: Signal<string> = computed<string>(() => `${this.triggerId()}-time`);

  /**
   * Property timeLabelId
   * @readonly
   *
   * @description
   * Id of the « Heure » label, which names the time input's group.
   *
   * @type {Signal<string>}
   */
  protected readonly timeLabelId: Signal<string> = computed<string>(
    () => `${this.triggerId()}-time-label`,
  );

  /**
   * Property field
   * @readonly
   *
   * @description
   * Enclosing `ui-field`, if any; skips the null provider this component gives its own view.
   *
   * @type {FieldHost | null}
   */
  private readonly field: FieldHost | null = inject<FieldHost>(FIELD_HOST, {
    optional: true,
    skipSelf: true,
  });

  /**
   * Property showInvalid
   * @readonly
   *
   * @description
   * Invalid state as displayed (`aria-invalid` on the trigger): invalid and touched, or the error
   * shown by the enclosing `ui-field`.
   *
   * @type {Signal<boolean>}
   */
  protected readonly showInvalid: Signal<boolean> = computed<boolean>(
    (): boolean => (this.invalid() && this.touched()) || !!this.field?.invalid(),
  );

  /**
   * Property trigger
   * @readonly
   *
   * @description
   * Required trigger button reference used for focus and outside-click checks.
   *
   * @type {Signal<ElementRef<HTMLButtonElement>>}
   */
  private readonly trigger: Signal<ElementRef<HTMLButtonElement>> =
    viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  /**
   * Property calendar
   * @readonly
   *
   * @description
   * Optional embedded calendar instance focused after the overlay is attached.
   *
   * @type {Signal<CalendarComponent | undefined>}
   */
  private readonly calendar: Signal<CalendarComponent | undefined> =
    viewChild<CalendarComponent>(CalendarComponent);

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Application locale used to format the selected value.
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /**
   * Property document
   * @readonly
   *
   * @description
   * Owner document used to inspect active focus when the overlay closes.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Parent injection context used to schedule render callbacks for focus management.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property formatter
   * @readonly
   *
   * @description
   * Date and time formatter recreated when the locale or format options change.
   *
   * @type {Signal<Intl.DateTimeFormat>}
   */
  private readonly formatter: Signal<Intl.DateTimeFormat> = computed<Intl.DateTimeFormat>(
    () => new Intl.DateTimeFormat(this.locale, this.format()),
  );

  /**
   * Property display
   * @readonly
   *
   * @description
   * Localized selected date and time, falling back to the configured placeholder.
   *
   * @type {Signal<string>}
   */
  protected readonly display: Signal<string> = computed<string>(() => {
    const value: Date | null = this.value();
    return value ? this.formatter().format(value) : this.placeholder();
  });

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Full-width block layout combined with caller-provided wrapper classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('block w-full', this.class()),
  );

  /**
   * Property triggerClasses
   * @readonly
   *
   * @description
   * Shared input appearance with open-state border and placeholder text treatment.
   *
   * @type {Signal<string>}
   */
  protected readonly triggerClasses: Signal<string> = computed<string>(() =>
    cn(
      inputVariants({ size: this.size() }),
      'inline-flex cursor-pointer items-center justify-between gap-3 text-left',
      this.open() && 'border-accent/55',
      !this.value() && 'text-fg-faint',
    ),
  );
  // #endregion

  // #region Methods
  /**
   * Method focus
   * @method focus
   *
   * @description
   * Focuses the trigger button so form and field integrations can return focus to the control.
   *
   * @param {FocusOptions} options - Optional browser focus behavior.
   * @returns {void}
   */
  public focus(options?: FocusOptions): void {
    this.trigger().nativeElement.focus(options);
  }

  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Closes an open dialog with focus restoration or opens it when the control is editable.
   *
   * @returns {void}
   */
  protected toggle(): void {
    if (this.open()) this.close(true);
    else if (!this.disabled() && !this.readonly()) this.open.set(true);
  }

  /**
   * Method onAttach
   * @method onAttach
   *
   * @description
   * Moves focus into the calendar after the overlay has rendered.
   *
   * @returns {void}
   */
  protected onAttach(): void {
    afterNextRender(() => this.calendar()?.focus(), { injector: this.injector });
  }

  /**
   * Method selectDay
   * @method selectDay
   *
   * @description
   * Sets the value to the picked day at the time shown, or at `defaultTime` while the time is
   * incomplete; the dialog stays open for the time.
   *
   * @param {Date} day - Day picked in the calendar.
   * @returns {void}
   */
  protected selectDay(day: Date): void {
    const time: string = this.time();
    this.value.set(withTime(day, isCompleteTime(time) ? time : this.defaultTime()));
  }

  /**
   * Method onTimeChange
   * @method onTimeChange
   *
   * @description
   * Keeps the edited time and applies it to the value once a day is set; an incomplete time leaves
   * the value unchanged.
   *
   * @param {string} time - `HH:mm` time, or `''` while incomplete.
   * @returns {void}
   */
  protected onTimeChange(time: string): void {
    this.time.set(time);
    const value: Date | null = this.value();
    if (value && isCompleteTime(time)) this.value.set(withTime(value, time));
  }

  /**
   * Method onOverlayKeydown
   * @method onOverlayKeydown
   *
   * @description
   * Closes the dialog on an unmodified Escape key while leaving modified shortcuts untouched.
   *
   * @param {KeyboardEvent} event - Key event emitted from the overlay.
   * @returns {void}
   */
  protected onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    this.close(true);
  }

  /**
   * Method onOutsideClick
   * @method onOutsideClick
   *
   * @description
   * Closes the overlay without restoring trigger focus when the pointer target is outside the trigger.
   *
   * @param {MouseEvent} event - Outside-click event from the connected overlay.
   * @returns {void}
   */
  protected onOutsideClick(event: MouseEvent): void {
    // The trigger's own click toggles the popup.
    if (this.trigger().nativeElement.contains(event.target as Node | null)) return;
    this.close(false);
  }

  /**
   * Method onTriggerBlur
   * @method onTriggerBlur
   *
   * @description
   * Marks the control touched when focus leaves the trigger while the dialog is closed.
   *
   * @returns {void}
   */
  protected onTriggerBlur(): void {
    if (!this.open()) this.touch.emit();
  }

  /**
   * Method close
   * @method close
   *
   * @description
   * Closes an open dialog, marks the control touched, and restores trigger focus only when requested
   * or when focus has fallen back to the document body.
   *
   * @param {boolean} restoreFocus - Whether to return focus to the trigger after rendering.
   * @returns {void}
   */
  protected close(restoreFocus: boolean): void {
    if (!this.open()) return;
    this.open.set(false);
    this.touch.emit();
    afterNextRender(
      () => {
        const active: Element | null = this.document.activeElement;
        if (restoreFocus || !active || active === this.document.body) this.focus();
      },
      { injector: this.injector },
    );
  }
  // #endregion
}
