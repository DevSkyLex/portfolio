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
  output,
  signal,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight } from '@ng-icons/lucide';
import { ButtonDirective } from '@internal/ui/lib/button/button.directive';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import type { MonthCalendarCell } from '@internal/ui/lib/month-calendar/models/month-calendar-cell/month-calendar-cell.interface';
import type { MonthCalendarRange } from '@internal/ui/lib/month-calendar/models/month-calendar-range/month-calendar-range.interface';
import type { MonthCalendarUnit } from '@internal/ui/lib/month-calendar/models/month-calendar-unit/month-calendar-unit.type';
import type { PeriodBound } from '@internal/ui/lib/month-calendar/models/period-bound/period-bound.interface';
import {
  MONTH_CALENDAR_COLUMNS,
  MONTH_CALENDAR_PAGE,
  boundKey,
  clampBound,
  compareBounds,
  currentBound,
  isOutOfBounds,
  pageStart,
  sameBound,
  shiftBound,
  toUnit,
} from '@internal/ui/lib/month-calendar/utils/month-calendar/month-calendar.utils';

/**
 * Component MonthCalendarComponent
 * @class MonthCalendarComponent
 *
 * @description
 * Grid of the twelve months of a year, or of twelve years, the month and year counterpart of
 * `ui-calendar`: one roving tab stop, arrows by cell or row, Home and End within a row, Page Up and
 * Page Down by page. It shows a single value or a range (with a hover or keyboard preview of the
 * end) and emits the chosen cell; the pickers built on it decide what a choice means.
 */
@Component({
  selector: 'ui-month-calendar',
  imports: [ButtonDirective, NgIcon],
  templateUrl: './month-calendar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    'data-slot': 'month-calendar',
    '[attr.data-disabled]': 'disabled() || null',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class MonthCalendarComponent {
  // #region Properties
  /**
   * Property unit
   * @readonly
   *
   * @description
   * Cells shown: months of a year (default) or years.
   *
   * @type {InputSignal<MonthCalendarUnit>}
   */
  public readonly unit: InputSignal<MonthCalendarUnit> = input<MonthCalendarUnit>('month');

  /**
   * Property value
   * @readonly
   *
   * @description
   * Single chosen cell, drawn as selected.
   *
   * @type {InputSignal<PeriodBound | null>}
   */
  public readonly value: InputSignal<PeriodBound | null> = input<PeriodBound | null>(null);

  /**
   * Property range
   * @readonly
   *
   * @description
   * Range drawn on the grid; its start also places the grid when `value` is empty.
   *
   * @type {InputSignal<MonthCalendarRange | null>}
   */
  public readonly range: InputSignal<MonthCalendarRange | null> = input<MonthCalendarRange | null>(
    null,
  );

  /**
   * Property min
   * @readonly
   *
   * @description
   * Earliest selectable month or year, inclusive.
   *
   * @type {InputSignal<PeriodBound | undefined>}
   */
  public readonly min: InputSignal<PeriodBound | undefined> = input<PeriodBound | undefined>();

  /**
   * Property max
   * @readonly
   *
   * @description
   * Latest selectable month or year, inclusive.
   *
   * @type {InputSignal<PeriodBound | undefined>}
   */
  public readonly max: InputSignal<PeriodBound | undefined> = input<PeriodBound | undefined>();

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Disables every cell and the page navigation.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly disabled: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property previousLabel
   * @readonly
   *
   * @description
   * Accessible name of the previous-page button; defaults to the year or years wording of the unit.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly previousLabel: InputSignal<string | undefined> = input<string>();

  /**
   * Property nextLabel
   * @readonly
   *
   * @description
   * Accessible name of the next-page button; defaults to the year or years wording of the unit.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly nextLabel: InputSignal<string | undefined> = input<string>();

  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged on the host.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property cellSelect
   * @readonly
   *
   * @description
   * Emits the month or year the user chose.
   *
   * @type {OutputEmitterRef<PeriodBound>}
   */
  public readonly cellSelect: OutputEmitterRef<PeriodBound> = output<PeriodBound>();

  /**
   * Property touch
   * @readonly
   *
   * @description
   * Emits when focus leaves the grid for another element.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly touch: OutputEmitterRef<void> = output<void>();

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Chevrons of the page navigation.
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
   * Id of the page heading, which names the grid.
   *
   * @type {string}
   */
  protected readonly headingId: string =
    inject<RenderIdService>(RenderIdService).next('ui-month-calendar-') + '-heading';

  /**
   * Property hovered
   * @readonly
   *
   * @description
   * Cell under the pointer, or reached with the keyboard, that previews the end of a range.
   *
   * @type {WritableSignal<PeriodBound | null>}
   */
  protected readonly hovered: WritableSignal<PeriodBound | null> = signal<PeriodBound | null>(null);

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Application locale of the month names.
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /**
   * Property dir
   * @readonly
   *
   * @description
   * Text direction, which reverses ArrowLeft and ArrowRight in right-to-left layouts.
   *
   * @type {Directionality}
   */
  private readonly dir: Directionality = inject<Directionality>(Directionality);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Injector of the deferred focus moves.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property element
   * @readonly
   *
   * @description
   * Host, searched for the cell to focus and checked when focus leaves.
   *
   * @type {HTMLElement}
   */
  private readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property formats
   * @readonly
   *
   * @description
   * Short month names for the cells and month-and-year names for their accessible labels.
   */
  private readonly formats: { short: Intl.DateTimeFormat; full: Intl.DateTimeFormat } = {
    short: new Intl.DateTimeFormat(this.locale, { month: 'short' }),
    full: new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' }),
  };

  /**
   * Property focused
   * @readonly
   *
   * @description
   * Cell holding the roving tab stop; its page is the one shown. It follows the value, then the
   * range start, then the current month, in the unit and within the bounds.
   */
  private readonly focused: WritableSignal<PeriodBound> = linkedSignal<PeriodBound>(() => {
    const unit: MonthCalendarUnit = this.unit();
    const anchor: PeriodBound = this.value() ?? this.range()?.start ?? currentBound(unit);
    return clampBound(toUnit(anchor, unit), unit, this.min(), this.max());
  });

  /**
   * Property first
   * @readonly
   *
   * @description
   * First cell of the page shown.
   *
   * @type {Signal<PeriodBound>}
   */
  private readonly first: Signal<PeriodBound> = computed<PeriodBound>(() =>
    pageStart(this.focused(), this.unit()),
  );

  /**
   * Property heading
   * @readonly
   *
   * @description
   * Page title: the year, or the span of years.
   *
   * @type {Signal<string>}
   */
  protected readonly heading: Signal<string> = computed<string>(() => {
    const year: number = this.first().year;
    return this.unit() === 'month' ? String(year) : `${year} – ${year + MONTH_CALENDAR_PAGE - 1}`;
  });

  /**
   * Property previousText
   * @readonly
   *
   * @description
   * Accessible name of the previous-page button.
   *
   * @type {Signal<string>}
   */
  protected readonly previousText: Signal<string> = computed<string>(
    () =>
      this.previousLabel() ??
      (this.unit() === 'month'
        ? $localize`:@@ui.monthCalendar.previousYear:Année précédente`
        : $localize`:@@ui.monthCalendar.previousYears:Années précédentes`),
  );

  /**
   * Property nextText
   * @readonly
   *
   * @description
   * Accessible name of the next-page button.
   *
   * @type {Signal<string>}
   */
  protected readonly nextText: Signal<string> = computed<string>(
    () =>
      this.nextLabel() ??
      (this.unit() === 'month'
        ? $localize`:@@ui.monthCalendar.nextYear:Année suivante`
        : $localize`:@@ui.monthCalendar.nextYears:Années suivantes`),
  );

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Cells of the page in rows of four, with their selection, range, focus, current and bound state.
   *
   * @type {Signal<MonthCalendarCell[][]>}
   */
  protected readonly rows: Signal<MonthCalendarCell[][]> = computed<MonthCalendarCell[][]>(() => {
    const unit: MonthCalendarUnit = this.unit();
    const first: PeriodBound = this.first();
    const focused: PeriodBound = this.focused();
    const now: PeriodBound = currentBound(unit);
    const range: MonthCalendarRange | null = this.range();
    const start: PeriodBound | null = range?.start ?? null;
    const end: PeriodBound | null = this.shownEnd();
    const cells: MonthCalendarCell[] = Array.from({ length: MONTH_CALENDAR_PAGE }, (_, index) => {
      const bound: PeriodBound = shiftBound(first, unit, index);
      const selected: boolean =
        sameBound(bound, this.value()) ||
        sameBound(bound, start) ||
        (!range?.ongoing && sameBound(bound, range?.end));
      return {
        bound,
        key: boundKey(bound),
        text: this.text(bound),
        label: this.label(bound),
        selected,
        inRange:
          !selected &&
          !!start &&
          !!end &&
          compareBounds(bound, start) >= 0 &&
          compareBounds(bound, end) <= 0,
        focused: sameBound(bound, focused),
        current: sameBound(bound, now),
        disabled: this.isUnavailable(bound),
      };
    });
    return Array.from({ length: MONTH_CALENDAR_PAGE / MONTH_CALENDAR_COLUMNS }, (_, row) =>
      cells.slice(row * MONTH_CALENDAR_COLUMNS, (row + 1) * MONTH_CALENDAR_COLUMNS),
    );
  });

  /**
   * Property canGoPrevious
   * @readonly
   *
   * @description
   * Whether the previous page holds a selectable cell.
   *
   * @type {Signal<boolean>}
   */
  protected readonly canGoPrevious: Signal<boolean> = computed<boolean>(() => {
    const min: PeriodBound | undefined = this.min();
    const last: PeriodBound = shiftBound(this.first(), this.unit(), -1);
    return !this.disabled() && (!min || compareBounds(last, min) >= 0);
  });

  /**
   * Property canGoNext
   * @readonly
   *
   * @description
   * Whether the next page holds a selectable cell.
   *
   * @type {Signal<boolean>}
   */
  protected readonly canGoNext: Signal<boolean> = computed<boolean>(() => {
    const max: PeriodBound | undefined = this.max();
    const next: PeriodBound = shiftBound(this.first(), this.unit(), MONTH_CALENDAR_PAGE);
    return !this.disabled() && (!max || compareBounds(next, max) <= 0);
  });

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Host layout, as wide as `ui-calendar`, with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('inline-flex w-76 flex-col gap-3 p-3 text-fg', this.class()),
  );

  /**
   * Property shownEnd
   * @readonly
   *
   * @description
   * End drawn for the range: the chosen end, the current month of an ongoing range, or the previewed
   * cell when only the start is chosen and the preview does not precede it.
   *
   * @type {Signal<PeriodBound | null>}
   */
  private readonly shownEnd: Signal<PeriodBound | null> = computed<PeriodBound | null>(() => {
    const range: MonthCalendarRange | null = this.range();
    if (!range?.start) return null;
    if (range.ongoing) return currentBound(this.unit());
    if (range.end) return range.end;
    const preview: PeriodBound | null = this.hovered();
    return preview && compareBounds(preview, range.start) >= 0 ? preview : null;
  });
  // #endregion

  // #region Methods
  /**
   * Method focus
   * @method focus
   *
   * @description
   * Focuses the cell holding the tab stop.
   *
   * @param {FocusOptions} options - Native focus options.
   *
   * @returns {void}
   */
  public focus(options?: FocusOptions): void {
    this.element
      .querySelector<HTMLElement>(`[data-cell="${boundKey(this.focused())}"]`)
      ?.focus(options);
  }

  /**
   * Method cellClasses
   * @method cellClasses
   *
   * @description
   * Classes of a cell button: base, focus ring, current, range, selection and unavailable states,
   * matching the day cells of `ui-calendar`.
   *
   * @param {MonthCalendarCell} cell - Cell state.
   *
   * @returns {string} Classes.
   */
  protected cellClasses(cell: MonthCalendarCell): string {
    return cn(
      'inline-flex h-9 w-full items-center justify-center rounded-md border border-transparent text-data text-fg tabular-nums',
      'transition-[background-color,border-color,color] duration-(--dur-pop) ease-orbit hover:bg-surface-hover motion-reduce:transition-none',
      'outline-4 outline-offset-0 outline-transparent focus-visible:border-fg/55 focus-visible:outline-fg/12',
      cell.current && !cell.selected && 'border-border-strong',
      cell.inRange && 'bg-surface-selected',
      cell.selected && 'bg-fill text-on-fill hover:bg-fg-muted',
      cell.disabled && 'cursor-not-allowed line-through opacity-40 hover:bg-transparent',
    );
  }

  /**
   * Method shiftPage
   * @method shiftPage
   *
   * @description
   * Shows the previous or next page, keeping the tab stop at the same position within the bounds.
   *
   * @param {number} pages - Signed number of pages.
   *
   * @returns {void}
   */
  protected shiftPage(pages: number): void {
    this.move(shiftBound(this.focused(), this.unit(), pages * MONTH_CALENDAR_PAGE), false);
  }

  /**
   * Method pick
   * @method pick
   *
   * @description
   * Moves the tab stop to an available cell and emits it.
   *
   * @param {MonthCalendarCell} cell - Chosen cell.
   *
   * @returns {void}
   */
  protected pick(cell: MonthCalendarCell): void {
    if (cell.disabled) return;
    this.focused.set(cell.bound);
    this.cellSelect.emit(cell.bound);
  }

  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * Moves the tab stop by cell, row (four cells), row edge or page, within the bounds, then focuses
   * it; the target also previews a range end.
   *
   * @param {KeyboardEvent} event - Key pressed in the grid.
   *
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent): void {
    const unit: MonthCalendarUnit = this.unit();
    const current: PeriodBound = this.focused();
    const back: 1 | -1 = this.dir.valueSignal() === 'rtl' ? 1 : -1;
    const index: number =
      unit === 'month' ? (current.month ?? 1) - 1 : current.year - this.first().year;
    const column: number = index % MONTH_CALENDAR_COLUMNS;
    const steps: Record<string, number> = {
      ArrowLeft: back,
      ArrowRight: -back,
      ArrowUp: -MONTH_CALENDAR_COLUMNS,
      ArrowDown: MONTH_CALENDAR_COLUMNS,
      Home: -column,
      End: MONTH_CALENDAR_COLUMNS - 1 - column,
      PageUp: -MONTH_CALENDAR_PAGE,
      PageDown: MONTH_CALENDAR_PAGE,
    };
    const step: number | undefined = steps[event.key];
    if (step === undefined) return;
    event.preventDefault();
    this.move(shiftBound(current, unit, step), true);
  }

  /**
   * Method onFocusOut
   * @method onFocusOut
   *
   * @description
   * Clears the preview and emits `touch` when focus leaves the grid.
   *
   * @param {FocusEvent} event - Focus transition.
   *
   * @returns {void}
   */
  protected onFocusOut(event: FocusEvent): void {
    if (this.element.contains(event.relatedTarget as Node | null)) return;
    this.hovered.set(null);
    this.touch.emit();
  }

  /**
   * Method move
   * @method move
   *
   * @description
   * Places the tab stop on a cell within the bounds and, from the keyboard, focuses and previews it.
   *
   * @param {PeriodBound} target - Wanted cell.
   * @param {boolean} fromKeyboard - Whether focus follows.
   *
   * @returns {void}
   */
  private move(target: PeriodBound, fromKeyboard: boolean): void {
    const bound: PeriodBound = clampBound(target, this.unit(), this.min(), this.max());
    this.focused.set(bound);
    if (!fromKeyboard) return;
    this.hovered.set(bound);
    afterNextRender(() => this.focus(), { injector: this.injector });
  }

  /**
   * Method text
   * @method text
   *
   * @description
   * Visible cell text: the capitalized short month name, or the year.
   *
   * @param {PeriodBound} bound - Cell.
   *
   * @returns {string} Text.
   */
  private text(bound: PeriodBound): string {
    if (bound.month === null) return String(bound.year);
    const name: string = this.formats.short.format(new Date(bound.year, bound.month - 1, 1));
    return name.charAt(0).toLocaleUpperCase(this.locale) + name.slice(1);
  }

  /**
   * Method label
   * @method label
   *
   * @description
   * Accessible cell name: the month and year, or the year.
   *
   * @param {PeriodBound} bound - Cell.
   *
   * @returns {string} Label.
   */
  private label(bound: PeriodBound): string {
    return bound.month === null
      ? String(bound.year)
      : this.formats.full.format(new Date(bound.year, bound.month - 1, 1));
  }

  /**
   * Method isUnavailable
   * @method isUnavailable
   *
   * @description
   * Whether a cell cannot be chosen: control disabled or outside the bounds.
   *
   * @param {PeriodBound} bound - Cell.
   *
   * @returns {boolean} Whether it is unavailable.
   */
  private isUnavailable(bound: PeriodBound): boolean {
    return this.disabled() || isOutOfBounds(bound, this.min(), this.max());
  }
  // #endregion
}
