import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  inject,
  input,
  linkedSignal,
  model,
  signal,
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { NgIcon } from '@ng-icons/core';
import { ButtonDirective } from '@internal/ui/lib/button/button.directive';
import { CheckboxComponent } from '@internal/ui/lib/checkbox/checkbox.component';
import { MonthPopoverBase } from '@internal/ui/lib/month-calendar/directives/month-popover-base/month-popover-base';
import { MonthCalendarComponent } from '@internal/ui/lib/month-calendar/month-calendar.component';
import type { MonthCalendarRange } from '@internal/ui/lib/month-calendar/models/month-calendar-range/month-calendar-range.interface';
import type { MonthCalendarUnit } from '@internal/ui/lib/month-calendar/models/month-calendar-unit/month-calendar-unit.type';
import type { PeriodBound } from '@internal/ui/lib/month-calendar/models/period-bound/period-bound.interface';
import { compareBounds } from '@internal/ui/lib/month-calendar/utils/month-calendar/month-calendar.utils';
import type { Period } from '@internal/ui/lib/period-picker/models/period/period.interface';
import type { PeriodPrecision } from '@internal/ui/lib/period-picker/models/period-precision/period-precision.type';
import { formatPeriod } from '@internal/ui/lib/period-picker/utils/period-format/period-format.utils';
import {
  ToggleGroupDirective,
  ToggleGroupItemDirective,
} from '@internal/ui/lib/toggle-group/toggle-group.directive';

/**
 * Component PeriodPickerComponent
 * @class PeriodPickerComponent
 *
 * @description
 * Signal Forms control for a period of months or whole years, possibly ongoing. The trigger shows
 * the period in the application locale (« Mars – avril 2023 », « Depuis juillet 2026 »); its dialog
 * holds a `ui-month-calendar`: a first choice sets the start, a second the end (an earlier one
 * restarts), with a preview of the range in between; « En cours » makes a single choice enough and
 * ends the period at none. With `precision="flexible"` a « Mois / Années » switch picks the unit.
 */
@Component({
  selector: 'ui-period-picker',
  imports: [
    ButtonDirective,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    CdkTrapFocus,
    CheckboxComponent,
    MonthCalendarComponent,
    NgIcon,
    ToggleGroupDirective,
    ToggleGroupItemDirective,
  ],
  templateUrl: './period-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    'data-slot': 'period-picker',
    '[attr.data-state]': 'open() ? "open" : "closed"',
  },
})
export class PeriodPickerComponent
  extends MonthPopoverBase
  implements FormValueControl<Period | null>
{
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Chosen period; an ongoing one has a `null` end.
   *
   * @type {ModelSignal<Period | null>}
   */
  public readonly value: ModelSignal<Period | null> = model<Period | null>(null);

  /**
   * Property precision
   * @readonly
   *
   * @description
   * Months (default), whole years, or either through the « Mois / Années » switch.
   *
   * @type {InputSignal<PeriodPrecision>}
   */
  public readonly precision: InputSignal<PeriodPrecision> = input<PeriodPrecision>('month');

  /**
   * Property allowOngoing
   * @readonly
   *
   * @description
   * Whether the dialog offers the « En cours » option (default true).
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly allowOngoing: InputSignalWithTransform<boolean, unknown> = input<
    boolean,
    unknown
  >(true, { transform: booleanAttribute });

  /**
   * Property minBound
   * @readonly
   *
   * @description
   * Earliest selectable month or year, inclusive (`min` belongs to Signal Forms, which binds it from
   * the field and refuses a manual binding beside `[formField]`).
   *
   * @type {InputSignal<PeriodBound | undefined>}
   */
  public readonly minBound: InputSignal<PeriodBound | undefined> = input<PeriodBound | undefined>();

  /**
   * Property maxBound
   * @readonly
   *
   * @description
   * Latest selectable month or year, inclusive (see `minBound`).
   *
   * @type {InputSignal<PeriodBound | undefined>}
   */
  public readonly maxBound: InputSignal<PeriodBound | undefined> = input<PeriodBound | undefined>();

  /**
   * Property placeholder
   * @readonly
   *
   * @description
   * Trigger text while no period is chosen.
   *
   * @type {InputSignal<string>}
   */
  public readonly placeholder: InputSignal<string> = input<string>(
    $localize`:@@ui.periodPicker.placeholder:Choisir une période`,
  );

  /**
   * Property dialogLabel
   * @readonly
   *
   * @description
   * Accessible name of the dialog.
   *
   * @type {InputSignal<string>}
   */
  public readonly dialogLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.periodPicker.dialog:Choisir une période`,
  );

  /**
   * Property ongoingLabel
   * @readonly
   *
   * @description
   * Label of the option that leaves the period without an end.
   *
   * @type {InputSignal<string>}
   */
  public readonly ongoingLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.periodPicker.ongoing:En cours`,
  );

  /**
   * Property texts
   * @readonly
   *
   * @description
   * Fixed wording of the dialog.
   */
  protected readonly texts: {
    readonly precision: string;
    readonly months: string;
    readonly years: string;
    readonly clear: string;
  } = {
    precision: $localize`:@@ui.periodPicker.precision:Précision`,
    months: $localize`:@@ui.periodPicker.months:Mois`,
    years: $localize`:@@ui.periodPicker.years:Années`,
    clear: $localize`:@@ui.periodPicker.clear:Effacer`,
  } as const;

  /**
   * Property ongoingId
   * @readonly
   *
   * @description
   * Id of the « En cours » checkbox, referenced by its label.
   *
   * @type {string}
   */
  protected readonly ongoingId: string =
    inject<RenderIdService>(RenderIdService).next('ui-period-picker-') + '-ongoing';

  /**
   * Property pendingStart
   * @readonly
   *
   * @description
   * Start chosen in the dialog while the end is still to choose; the value changes only once the
   * period is complete.
   *
   * @type {WritableSignal<PeriodBound | null>}
   */
  protected readonly pendingStart: WritableSignal<PeriodBound | null> = signal<PeriodBound | null>(
    null,
  );

  /**
   * Property unit
   * @readonly
   *
   * @description
   * Cells of the dialog: fixed by `precision`, or switchable and starting at the value's unit.
   *
   * @type {WritableSignal<MonthCalendarUnit>}
   */
  protected readonly unit: WritableSignal<MonthCalendarUnit> = linkedSignal<MonthCalendarUnit>(() =>
    this.valueUnit(),
  );

  /**
   * Property ongoing
   * @readonly
   *
   * @description
   * State of the « En cours » option, following the value until the user changes it.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly ongoing: WritableSignal<boolean> = linkedSignal<boolean>(() => {
    const value: Period | null = this.value();
    return value !== null && value.end === null;
  });

  /**
   * Property range
   * @readonly
   *
   * @description
   * Range drawn by the grid: the pending start (with its preview), else the value.
   *
   * @type {Signal<MonthCalendarRange | null>}
   */
  protected readonly range: Signal<MonthCalendarRange | null> = computed<MonthCalendarRange | null>(
    () => {
      const pending: PeriodBound | null = this.pendingStart();
      if (pending) return { start: pending, end: null };
      const value: Period | null = this.value();
      return value ? { start: value.start, end: value.end, ongoing: value.end === null } : null;
    },
  );

  /**
   * Property status
   * @readonly
   *
   * @description
   * Polite hint of the next choice.
   *
   * @type {Signal<string>}
   */
  protected readonly status: Signal<string> = computed<string>(() =>
    this.pendingStart() && !this.ongoing()
      ? $localize`:@@ui.periodPicker.chooseEnd:Choisissez la fin.`
      : $localize`:@@ui.periodPicker.chooseStart:Choisissez le début.`,
  );

  /**
   * Property display
   * @readonly
   *
   * @description
   * Trigger text: the period in the application locale, or the placeholder.
   *
   * @type {Signal<string>}
   */
  protected readonly display: Signal<string> = computed<string>(() => {
    const value: Period | null = this.value();
    return value
      ? formatPeriod(
          value,
          this.locale,
          (start: string): string => $localize`:@@ui.periodPicker.since:Depuis ${start}:start:`,
        )
      : this.placeholder();
  });
  // #endregion

  // #region Methods
  /**
   * Method empty
   * @method empty
   *
   * @description
   * Whether no period is chosen.
   *
   * @returns {boolean} Whether it is empty.
   */
  protected empty(): boolean {
    return this.value() === null;
  }

  /**
   * Method onOpen
   * @method onOpen
   *
   * @description
   * Opens on the value: no pending start, the value's unit and ongoing state.
   *
   * @returns {void}
   */
  protected override onOpen(): void {
    const value: Period | null = this.value();
    this.pendingStart.set(null);
    this.unit.set(this.valueUnit());
    this.ongoing.set(value !== null && value.end === null);
  }

  /**
   * Method select
   * @method select
   *
   * @description
   * Applies a chosen cell: the whole period while « En cours » is checked, otherwise the start,
   * then the end (an earlier cell restarts from it); a complete period closes the dialog.
   *
   * @param {PeriodBound} cell - Chosen month or year.
   *
   * @returns {void}
   */
  protected select(cell: PeriodBound): void {
    if (this.ongoing()) {
      this.commit({ start: cell, end: null });
      return;
    }
    const start: PeriodBound | null = this.pendingStart();
    if (!start || compareBounds(cell, start) < 0) {
      this.pendingStart.set(cell);
      return;
    }
    this.commit({ start, end: cell });
  }

  /**
   * Method setOngoing
   * @method setOngoing
   *
   * @description
   * Checking « En cours » ends the period at none as soon as a start exists; unchecking an ongoing
   * period keeps its start pending until an end is chosen. The dialog stays open.
   *
   * @param {boolean} ongoing - New state of the option.
   *
   * @returns {void}
   */
  protected setOngoing(ongoing: boolean): void {
    this.ongoing.set(ongoing);
    const value: Period | null = this.value();
    if (ongoing) {
      const start: PeriodBound | null = this.pendingStart() ?? value?.start ?? null;
      if (!start) return;
      this.value.set({ start, end: null });
      this.pendingStart.set(null);
    } else if (value && value.end === null) {
      this.pendingStart.set(value.start);
    }
  }

  /**
   * Method setUnit
   * @method setUnit
   *
   * @description
   * Switches between months and years, dropping a pending start of the other unit.
   *
   * @param {unknown} unit - Value of the switch.
   *
   * @returns {void}
   */
  protected setUnit(unit: unknown): void {
    if (unit !== 'month' && unit !== 'year') return;
    this.unit.set(unit);
    this.pendingStart.set(null);
  }

  /**
   * Method clear
   * @method clear
   *
   * @description
   * Empties the value and the pending choice.
   *
   * @returns {void}
   */
  protected clear(): void {
    this.value.set(null);
    this.pendingStart.set(null);
    this.ongoing.set(false);
  }

  /**
   * Method commit
   * @method commit
   *
   * @description
   * Sets a complete period and closes the dialog with focus restoration.
   *
   * @param {Period} period - Chosen period.
   *
   * @returns {void}
   */
  private commit(period: Period): void {
    this.value.set(period);
    this.pendingStart.set(null);
    this.close(true);
  }

  /**
   * Method valueUnit
   * @method valueUnit
   *
   * @description
   * Unit fixed by `precision`, or, when flexible, the unit of the value (months by default).
   *
   * @returns {MonthCalendarUnit} Unit.
   */
  private valueUnit(): MonthCalendarUnit {
    const precision: PeriodPrecision = this.precision();
    if (precision !== 'flexible') return precision;
    return this.value()?.start.month === null ? 'year' : 'month';
  }
  // #endregion
}
