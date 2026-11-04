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
import { CalendarComponent } from '@internal/ui/lib/calendar/calendar.component';
import type { CalendarRange } from '@internal/ui/lib/calendar/models/calendar/calendar-range.interface';
import type { Weekday } from '@internal/ui/lib/calendar/models/calendar/weekday.type';
import { compareDays, rangeSpan } from '@internal/ui/lib/calendar/utils/calendar/calendar.utils';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { POSITIONS } from '@internal/ui/lib/date-picker/constants/date-picker.constants';
import { DATE_RANGE_PICKER_PROMPTS } from '@internal/ui/lib/date-range-picker/constants/date-range-picker.constants';
import type { DateRange } from '@internal/ui/lib/date-range-picker/models/date-range/date-range.interface';
import type { DateRangePickerPrompts } from '@internal/ui/lib/date-range-picker/models/date-range-picker-prompts/date-range-picker-prompts.interface';
import type { FieldHost } from '@internal/ui/lib/field/models/field/field-host.interface';
import { FIELD_HOST } from '@internal/ui/lib/field/tokens/field/field.token';
import { type InputSize, inputVariants } from '@internal/ui/lib/input/constants/input.variants';

/**
 * Class DateRangePickerComponent
 * @class DateRangePickerComponent
 *
 * @description
 * Signal Forms control of an inclusive range of days, built like `ui-date-picker`: a field-styled
 * trigger shows the range formatted with `Intl.DateTimeFormat#formatRange` and opens a focus-trapped
 * dialog holding a `ui-calendar` in range mode. The first pick sets a pending start (the value is
 * unchanged), the second commits `{ start, end }` and closes; a second day before the pending start
 * becomes the new start, and the same day twice gives a one-day range. Escape, an outside click or
 * the trigger closes the dialog and discards a pending start; focus returns to the trigger unless
 * the user moved it elsewhere. A polite status under the grid tells which end the next pick chooses.
 *
 * The invalid state shows once the control is touched or when the enclosing `ui-field` shows an
 * error, like `ui-tags-input`.
 *
 * ```html
 * <ui-date-range-picker triggerId="stay" [minDate]="today" [formField]="form.stay" />
 * ```
 */
@Component({
  selector: 'ui-date-range-picker',
  imports: [CalendarComponent, CdkConnectedOverlay, CdkOverlayOrigin, CdkTrapFocus, NgIcon],
  templateUrl: './date-range-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    'data-slot': 'date-range-picker',
    '[attr.data-state]': 'open() ? "open" : "closed"',
  },
})
export class DateRangePickerComponent implements FormValueControl<DateRange | null> {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Committed range bound to the Signal Forms control contract; `null` until two days are picked.
   *
   * @type {ModelSignal<DateRange | null>}
   */
  public readonly value: ModelSignal<DateRange | null> = model<DateRange | null>(null);

  /**
   * Property minDate
   * @readonly
   *
   * @description
   * Earliest selectable day, inclusive. Not named `min`: `FormValueControl<DateRange | null>`
   * reserves `min` and `max` for bounds of the value type (a `DateRange`), which `[formField]` binds
   * from the field's metadata.
   *
   * @type {InputSignal<Date | undefined>}
   */
  public readonly minDate: InputSignal<Date | undefined> = input<Date | undefined>();

  /**
   * Property maxDate
   * @readonly
   *
   * @description
   * Latest selectable day, inclusive; named like `minDate` for the same reason.
   *
   * @type {InputSignal<Date | undefined>}
   */
  public readonly maxDate: InputSignal<Date | undefined> = input<Date | undefined>();

  /**
   * Property dateDisabled
   * @readonly
   *
   * @description
   * Optional predicate for days unavailable beyond the bounds; such days stay inside a range that
   * spans them.
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
   * Property disabled
   * @readonly
   *
   * @description
   * Disables the trigger; Signal Forms binds it.
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
   * Keeps the trigger focusable and showing the range, without opening the dialog.
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
   * Validation state; Signal Forms binds it, and it shows once the control is touched.
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
   * Whether the control was left once. Signal Forms binds it, so an invalid range turns red after the
   * trigger is left, the dialog closed or the form submitted; unbound, `invalid` shows at once.
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
   * Required state, exposed as `aria-required` on the trigger; Signal Forms binds it.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly required: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property format
   * @readonly
   *
   * @description
   * Locale-aware options of the range shown by the trigger (« 3–18 mars 2026 » by default).
   *
   * @type {InputSignal<Intl.DateTimeFormatOptions>}
   */
  public readonly format: InputSignal<Intl.DateTimeFormatOptions> =
    input<Intl.DateTimeFormatOptions>({ dateStyle: 'long' });

  /**
   * Property placeholder
   * @readonly
   *
   * @description
   * Trigger text while no range is committed.
   *
   * @type {InputSignal<string>}
   */
  public readonly placeholder: InputSignal<string> = input<string>(
    $localize`:@@ui.dateRangePicker.placeholder:Choisir des dates`,
  );

  /**
   * Property dialogLabel
   * @readonly
   *
   * @description
   * Accessible name of the calendar dialog.
   *
   * @type {InputSignal<string>}
   */
  public readonly dialogLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.dateRangePicker.dialog:Choisir des dates`,
  );

  /**
   * Property prompts
   * @readonly
   *
   * @description
   * Status lines read under the grid before the first and the second pick.
   *
   * @type {InputSignal<DateRangePickerPrompts>}
   */
  public readonly prompts: InputSignal<DateRangePickerPrompts> =
    input<DateRangePickerPrompts>(DATE_RANGE_PICKER_PROMPTS);

  /**
   * Property triggerId
   * @readonly
   *
   * @description
   * Id of the trigger, for an external label, and base of the dialog and status ids.
   *
   * @type {InputSignal<string>}
   */
  public readonly triggerId: InputSignal<string> = input<string>(
    inject<RenderIdService>(RenderIdService).next('ui-date-range-picker-'),
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
   * Calendar icon of the trigger, the one of `ui-date-picker`.
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
   * Overlay placements of the dialog, shared with `ui-date-picker`.
   *
   * @type {ConnectedPosition[]}
   */
  protected readonly positions: ConnectedPosition[] = POSITIONS;

  /**
   * Property open
   * @readonly
   *
   * @description
   * Whether the calendar overlay is currently attached.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly open: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property pendingStart
   * @readonly
   *
   * @description
   * First day picked in the open dialog, waiting for the second pick; cleared on close.
   *
   * @type {WritableSignal<Date | null>}
   */
  protected readonly pendingStart: WritableSignal<Date | null> = signal<Date | null>(null);

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
   * Property statusId
   * @readonly
   *
   * @description
   * Id of the status line, which also describes the dialog.
   *
   * @type {Signal<string>}
   */
  protected readonly statusId: Signal<string> = computed<string>(
    () => `${this.triggerId()}-status`,
  );

  /**
   * Property calendarRange
   * @readonly
   *
   * @description
   * Range drawn by the calendar: the pending start alone while one is chosen, else the committed
   * range, else an empty range.
   *
   * @type {Signal<CalendarRange>}
   */
  protected readonly calendarRange: Signal<CalendarRange> = computed<CalendarRange>(() => {
    const pending: Date | null = this.pendingStart();
    if (pending) return { start: pending, end: null };
    const value: DateRange | null = this.value();
    return { start: value?.start ?? null, end: value?.end ?? null };
  });

  /**
   * Property status
   * @readonly
   *
   * @description
   * Status line telling which end of the range the next pick chooses.
   *
   * @type {Signal<string>}
   */
  protected readonly status: Signal<string> = computed<string>(() =>
    this.pendingStart() ? this.prompts().end : this.prompts().start,
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
   * Property fieldHost
   * @readonly
   *
   * @description
   * Enclosing `ui-field`, whose shown error also marks the trigger invalid.
   *
   * @type {FieldHost | null}
   */
  private readonly fieldHost: FieldHost | null = inject<FieldHost>(FIELD_HOST, { optional: true });

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Application locale used to format the range.
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
   * Date formatter recreated when the locale or format options change.
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
   * Localized range text, its ends put in order first (some engines refuse a reversed range), or
   * the placeholder.
   *
   * @type {Signal<string>}
   */
  protected readonly display: Signal<string> = computed<string>(() => {
    const value: DateRange | null = this.value();
    const span: { start: Date; end: Date } | null = value ? rangeSpan(value) : null;
    return span ? this.formatter().formatRange(span.start, span.end) : this.placeholder();
  });

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
  protected readonly showInvalid: Signal<boolean> = computed<boolean>(
    (): boolean => (this.invalid() && this.touched()) || !!this.fieldHost?.invalid(),
  );

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
   *
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
   * Closes an open calendar with focus restoration or opens it when the control is editable.
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
   * Method select
   * @method select
   *
   * @description
   * Takes a picked day: without a pending start, or before it, the day becomes the pending start;
   * otherwise the range from the pending start to the day, possibly the same day, is committed and
   * the dialog closes with focus restoration.
   *
   * @param {Date} date - Day picked in the calendar, at local midnight.
   *
   * @returns {void}
   */
  protected select(date: Date): void {
    const start: Date | null = this.pendingStart();
    if (!start || compareDays(date, start) < 0) {
      this.pendingStart.set(date);
      return;
    }
    this.value.set({ start, end: date });
    this.close(true);
  }

  /**
   * Method onOverlayKeydown
   * @method onOverlayKeydown
   *
   * @description
   * Closes the dialog on an unmodified Escape key while leaving modified shortcuts untouched.
   *
   * @param {KeyboardEvent} event - Key event emitted from the overlay.
   *
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
   *
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
   * Marks the control touched when focus leaves the trigger while the calendar is closed.
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
   * Closes an open popup, discards a pending start, marks the control touched, and restores trigger
   * focus only when requested or when focus has fallen back to the document body.
   *
   * @param {boolean} restoreFocus - Whether to return focus to the trigger after rendering.
   *
   * @returns {void}
   */
  protected close(restoreFocus: boolean): void {
    if (!this.open()) return;
    this.open.set(false);
    this.pendingStart.set(null);
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
