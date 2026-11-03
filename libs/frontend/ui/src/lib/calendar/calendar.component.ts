import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import { Directionality } from '@angular/cdk/bidi';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
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
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { NgIcon } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight } from '@ng-icons/lucide';
import { ButtonDirective } from '@internal/ui/lib/button/button.directive';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  addDays,
  addMonths,
  clampDay,
  dayKey,
  firstDayOfWeek,
  isOutOfRange,
  isSameDay,
  isSameMonth,
  monthGrid,
  startOfDay,
  startOfMonth,
  weekDays,
} from '@internal/ui/lib/calendar/utils/calendar/calendar.utils';
import type { Weekday } from '@internal/ui/lib/calendar/models/calendar/weekday.type';
import type { CalendarDay } from '@internal/ui/lib/calendar/models/calendar/calendar-day.interface';

/**
 * Component CalendarComponent
 * @class CalendarComponent
 *
 * @description
 * Implements a single-date APG calendar grid with locale-derived labels and week ordering. Arrow
 * keys move by day or week, Home and End move within a week, and Page Up or Down changes month or
 * year when Shift is held.
 */
@Component({
  selector: 'ui-calendar',
  imports: [ButtonDirective, NgIcon],
  templateUrl: './calendar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    'data-slot': 'calendar',
    '[attr.data-disabled]': 'disabled() || null',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class CalendarComponent implements FormValueControl<Date | null> {
  // #region Properties
  /**
   * Property value
   *
   * @description
   * Selected local date or null when the calendar has no selection.
   *
   * @type {ModelSignal<Date | null>}
   */
  public readonly value: ModelSignal<Date | null> = model<Date | null>(null);

  /**
   * Property min
   * @readonly
   *
   * @description
   * Optional inclusive lower bound for selectable dates.
   *
   * @type {InputSignal<Date | undefined>}
   */
  public readonly min: InputSignal<Date | undefined> = input<Date | undefined>();

  /**
   * Property max
   * @readonly
   *
   * @description
   * Optional inclusive upper bound for selectable dates.
   *
   * @type {InputSignal<Date | undefined>}
   */
  public readonly max: InputSignal<Date | undefined> = input<Date | undefined>();

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Disables every date and prevents selection changes.
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
   * Prevents date selection while preserving calendar navigation.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly readonly: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property dateDisabled
   * @readonly
   *
   * @description
   * Optional predicate that marks additional dates unavailable, such as weekends or holidays.
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
   * Optional first weekday; when omitted, the component uses locale week data.
   *
   * @type {InputSignal<Weekday | undefined>}
   */
  public readonly weekStartsOn: InputSignal<Weekday | undefined> = input<Weekday>();

  /**
   * Property previousLabel
   * @readonly
   *
   * @description
   * Accessible label for the previous-month control, with a localized default.
   *
   * @type {InputSignal<string>}
   */
  public readonly previousLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.calendar.previousMonth:Mois précédent`,
  );

  /**
   * Property nextLabel
   * @readonly
   *
   * @description
   * Accessible label for the next-month control, with a localized default.
   *
   * @type {InputSignal<string>}
   */
  public readonly nextLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.calendar.nextMonth:Mois suivant`,
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the calendar container layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property dateSelect
   * @readonly
   *
   * @description
   * Emits every valid user selection, including a date already selected.
   *
   * @type {OutputEmitterRef<Date>}
   */
  public readonly dateSelect: OutputEmitterRef<Date> = output<Date>();

  /**
   * Property touch
   * @readonly
   *
   * @description
   * Emits when focus leaves the calendar host for a different element.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly touch: OutputEmitterRef<void> = output<void>();

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Previous and next chevrons rendered by the month navigation controls.
   */
  protected readonly icons: {
    readonly previous: typeof lucideChevronLeft;
    readonly next: typeof lucideChevronRight;
  } = { previous: lucideChevronLeft, next: lucideChevronRight } as const;

  /**
   * Property headingId
   * @readonly
   *
   * @description
   * Generated heading identifier referenced by the calendar grid's accessible name.
   *
   * @type {string}
   */
  protected readonly headingId: string =
    inject<RenderIdService>(RenderIdService).next('ui-calendar-') + '-heading';

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Application locale used to create date and weekday formatters.
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /**
   * Property dir
   * @readonly
   *
   * @description
   * Document direction used to reverse horizontal keyboard movement in RTL layouts.
   *
   * @type {Directionality}
   */
  private readonly dir: Directionality = inject<Directionality>(Directionality);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Injector supplied to deferred focus restoration after keyboard navigation.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property element
   * @readonly
   *
   * @description
   * Calendar host used to focus cells and detect when focus leaves the control.
   *
   * @type {HTMLElement}
   */
  private readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property formats
   * @readonly
   *
   * @description
   * Locale-specific full date, day number, month, and weekday formatters reused by the grid.
   */
  private readonly formats: {
    full: Intl.DateTimeFormat;
    day: Intl.DateTimeFormat;
    month: Intl.DateTimeFormat;
    weekdayShort: Intl.DateTimeFormat;
    weekdayLong: Intl.DateTimeFormat;
  } = {
    full: new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' }),
    day: new Intl.DateTimeFormat(this.locale, { day: 'numeric' }),
    month: new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' }),
    weekdayShort: new Intl.DateTimeFormat(this.locale, { weekday: 'short' }),
    weekdayLong: new Intl.DateTimeFormat(this.locale, { weekday: 'long' }),
  };

  /**
   * Property focusedDate
   * @readonly
   *
   * @description
   * Date holding the roving tab stop; its month determines the displayed grid and it is clamped to
   * the optional bounds.
   */
  private readonly focusedDate: WritableSignal<Date> = linkedSignal<Date>(() =>
    clampDay(this.value() ?? new Date(), this.min(), this.max()),
  );

  /**
   * Property weekStart
   * @readonly
   *
   * @description
   * Effective first weekday from the explicit input or the application locale.
   *
   * @type {Signal<Weekday>}
   */
  private readonly weekStart: Signal<Weekday> = computed<Weekday>(
    () => this.weekStartsOn() ?? firstDayOfWeek(this.locale),
  );

  /**
   * Property month
   * @readonly
   *
   * @description
   * First day of the month containing the current roving-focus date.
   *
   * @type {Signal<Date>}
   */
  protected readonly month: Signal<Date> = computed<Date>(() => startOfMonth(this.focusedDate()));

  /**
   * Property monthLabel
   * @readonly
   *
   * @description
   * Localized visible label for the month shown by the grid.
   *
   * @type {Signal<string>}
   */
  protected readonly monthLabel: Signal<string> = computed<string>(() =>
    this.formats.month.format(this.month()),
  );

  /**
   * Property weekdays
   * @readonly
   *
   * @description
   * Short and full localized weekday labels ordered from the effective first weekday.
   */
  protected readonly weekdays: Signal<{ short: string; long: string }[]> = computed<
    { short: string; long: string }[]
  >(() =>
    weekDays(this.weekStart()).map((date) => ({
      short: this.formats.weekdayShort.format(date),
      long: this.formats.weekdayLong.format(date),
    })),
  );

  /**
   * Property weeks
   * @readonly
   *
   * @description
   * Calendar cells for the displayed month, including selection, focus, today, adjacent-month, and
   * unavailable state for each day.
   *
   * @type {Signal<CalendarDay[][]>}
   */
  protected readonly weeks: Signal<CalendarDay[][]> = computed<CalendarDay[][]>(() => {
    const month: Date = this.month();
    const focused: Date = this.focusedDate();
    const selected: Date | null = this.value();
    const today: Date = new Date();
    return monthGrid(month, this.weekStart()).map((week) =>
      week.map((date) => ({
        date,
        key: dayKey(date),
        number: this.formats.day.format(date),
        label: this.formats.full.format(date),
        selected: isSameDay(date, selected),
        focused: isSameDay(date, focused),
        today: isSameDay(date, today),
        outside: !isSameMonth(date, month),
        disabled: this.isUnavailable(date),
      })),
    );
  });

  /**
   * Property canGoPrevious
   * @readonly
   *
   * @description
   * Whether previous-month navigation remains enabled under the disabled state and minimum bound.
   *
   * @type {Signal<boolean>}
   */
  protected readonly canGoPrevious: Signal<boolean> = computed<boolean>(() => {
    const min: Date | undefined = this.min();
    return !this.disabled() && (!min || addDays(this.month(), -1) >= startOfDay(min));
  });

  /**
   * Property canGoNext
   * @readonly
   *
   * @description
   * Whether next-month navigation remains enabled under the disabled state and maximum bound.
   *
   * @type {Signal<boolean>}
   */
  protected readonly canGoNext: Signal<boolean> = computed<boolean>(() => {
    const max: Date | undefined = this.max();
    return !this.disabled() && (!max || addMonths(this.month(), 1) <= startOfDay(max));
  });

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Calendar container layout classes combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('inline-flex flex-col gap-3 p-3 text-star', this.class()),
  );
  // #endregion

  // #region Methods
  /**
   * Method focus
   * @method focus
   *
   * @description
   * Moves focus to the grid cell representing the current roving-tab-stop date.
   *
   * @param {FocusOptions} options - Optional native focus behavior.
   *
   * @returns {void}
   */
  public focus(options?: FocusOptions): void {
    this.element
      .querySelector<HTMLElement>(`[data-date="${dayKey(this.focusedDate())}"]`)
      ?.focus(options);
  }

  /**
   * Method dayClasses
   * @method dayClasses
   *
   * @description
   * Builds the cell's base, focus, selection, today, adjacent-month, and unavailable utility classes.
   *
   * @param {CalendarDay} day - Display and interaction state for the grid cell.
   *
   * @returns {string} Classes applied to the day button.
   */
  protected dayClasses(day: CalendarDay): string {
    return cn(
      'inline-flex size-9 items-center justify-center rounded-option border border-transparent text-data text-star tabular-nums',
      'transition-[background-color,border-color,color] duration-(--dur-pop) ease-orbit hover:bg-star/5 motion-reduce:transition-none',
      'outline-4 outline-offset-0 outline-transparent focus-visible:border-star/55 focus-visible:outline-star/12',
      day.outside && 'text-star-faint',
      day.today && !day.selected && 'border-line-strong',
      day.selected && 'bg-star text-void hover:bg-star-muted',
      day.disabled && 'cursor-not-allowed line-through opacity-40 hover:bg-transparent',
    );
  }

  /**
   * Method shiftMonth
   * @method shiftMonth
   *
   * @description
   * Moves the roving-focus date by the requested number of months and clamps it to the input bounds.
   *
   * @param {number} months - Signed number of months to move.
   *
   * @returns {void}
   */
  protected shiftMonth(months: number): void {
    this.focusedDate.set(clampDay(addMonths(this.focusedDate(), months), this.min(), this.max()));
  }

  /**
   * Method pick
   * @method pick
   *
   * @description
   * Ignores selection in readonly mode or for unavailable dates; otherwise normalizes the day,
   * updates the selected and focused values, and emits the selection event.
   *
   * @param {Date} date - Candidate date selected by the user.
   *
   * @returns {void}
   */
  protected pick(date: Date): void {
    if (this.readonly() || this.isUnavailable(date)) return;
    const day: Date = startOfDay(date);
    this.value.set(day);
    this.focusedDate.set(day);
    this.dateSelect.emit(day);
  }

  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * Handles grid navigation keys in the current text direction, clamps the target date to the
   * configured bounds, and focuses the resulting grid cell after rendering. At a bound, focus returns
   * to the current cell even when the clamped date does not change.
   *
   * @param {KeyboardEvent} event - Key event from the calendar grid.
   *
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent): void {
    const current: Date = this.focusedDate();
    const back: 1 | -1 = this.dir.valueSignal() === 'rtl' ? 1 : -1;
    const fromWeekStart: number = (current.getDay() - this.weekStart() + 7) % 7;
    const targets: Record<string, () => Date> = {
      ArrowLeft: () => addDays(current, back),
      ArrowRight: () => addDays(current, -back),
      ArrowUp: () => addDays(current, -7),
      ArrowDown: () => addDays(current, 7),
      Home: () => addDays(current, -fromWeekStart),
      End: () => addDays(current, 6 - fromWeekStart),
      PageUp: () => addMonths(current, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(current, event.shiftKey ? 12 : 1),
    };
    const target: (() => Date) | undefined = targets[event.key];
    if (!target) return;
    event.preventDefault();
    this.focusedDate.set(clampDay(target(), this.min(), this.max()));
    afterNextRender(() => this.focus(), { injector: this.injector });
  }

  /**
   * Method onFocusOut
   * @method onFocusOut
   *
   * @description
   * Emits the touch event only when focus moves outside the calendar host.
   *
   * @param {FocusEvent} event - Native focus transition event from the host.
   *
   * @returns {void}
   */
  protected onFocusOut(event: FocusEvent): void {
    if (!this.element.contains(event.relatedTarget as Node | null)) this.touch.emit();
  }

  /**
   * Method isUnavailable
   * @method isUnavailable
   *
   * @description
   * Combines component disabled state, inclusive date bounds, and the optional caller predicate.
   *
   * @param {Date} date - Candidate local date to evaluate.
   *
   * @returns {boolean} Whether the date cannot be selected.
   */
  private isUnavailable(date: Date): boolean {
    return (
      this.disabled() ||
      isOutOfRange(date, this.min(), this.max()) ||
      (this.dateDisabled()?.(date) ?? false)
    );
  }
  // #endregion
}
