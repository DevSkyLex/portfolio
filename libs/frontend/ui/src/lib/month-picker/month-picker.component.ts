import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  type InputSignal,
  type ModelSignal,
  type Signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { NgIcon } from '@ng-icons/core';
import { MonthPopoverBase } from '@internal/ui/lib/month-calendar/directives/month-popover-base/month-popover-base';
import { MonthCalendarComponent } from '@internal/ui/lib/month-calendar/month-calendar.component';
import type { PeriodBound } from '@internal/ui/lib/month-calendar/models/period-bound/period-bound.interface';
import type { YearMonth } from '@internal/ui/lib/month-picker/models/year-month/year-month.interface';

/**
 * Component MonthPickerComponent
 * @class MonthPickerComponent
 *
 * @description
 * Signal Forms control for a calendar month: a field-styled trigger (« mars 2026 ») opens a dialog
 * with the twelve months of a year; choosing one sets the value and closes it.
 */
@Component({
  selector: 'ui-month-picker',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, CdkTrapFocus, MonthCalendarComponent, NgIcon],
  templateUrl: './month-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    'data-slot': 'month-picker',
    '[attr.data-state]': 'open() ? "open" : "closed"',
  },
})
export class MonthPickerComponent
  extends MonthPopoverBase
  implements FormValueControl<YearMonth | null>
{
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Chosen month.
   *
   * @type {ModelSignal<YearMonth | null>}
   */
  public readonly value: ModelSignal<YearMonth | null> = model<YearMonth | null>(null);

  /**
   * Property minMonth
   * @readonly
   *
   * @description
   * Earliest selectable month, inclusive (`min` belongs to Signal Forms, which binds it from the
   * field and refuses a manual binding beside `[formField]`).
   *
   * @type {InputSignal<YearMonth | undefined>}
   */
  public readonly minMonth: InputSignal<YearMonth | undefined> = input<YearMonth | undefined>();

  /**
   * Property maxMonth
   * @readonly
   *
   * @description
   * Latest selectable month, inclusive (see `minMonth`).
   *
   * @type {InputSignal<YearMonth | undefined>}
   */
  public readonly maxMonth: InputSignal<YearMonth | undefined> = input<YearMonth | undefined>();

  /**
   * Property placeholder
   * @readonly
   *
   * @description
   * Trigger text while no month is chosen.
   *
   * @type {InputSignal<string>}
   */
  public readonly placeholder: InputSignal<string> = input<string>(
    $localize`:@@ui.monthPicker.placeholder:Choisir un mois`,
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
    $localize`:@@ui.monthPicker.dialog:Choisir un mois`,
  );

  /**
   * Property display
   * @readonly
   *
   * @description
   * Trigger text: the month and year in the application locale, or the placeholder.
   *
   * @type {Signal<string>}
   */
  protected readonly display: Signal<string> = computed<string>(() => {
    const value: YearMonth | null = this.value();
    return value
      ? new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' }).format(
          new Date(value.year, value.month - 1, 1),
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
   * Whether no month is chosen.
   *
   * @returns {boolean} Whether it is empty.
   */
  protected empty(): boolean {
    return this.value() === null;
  }

  /**
   * Method select
   * @method select
   *
   * @description
   * Sets the chosen month and closes the dialog with focus restoration.
   *
   * @param {PeriodBound} cell - Chosen cell, always a month here.
   *
   * @returns {void}
   */
  protected select(cell: PeriodBound): void {
    this.value.set({ year: cell.year, month: cell.month ?? 1 });
    this.close(true);
  }
  // #endregion
}
