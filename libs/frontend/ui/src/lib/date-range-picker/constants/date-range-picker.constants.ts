import type { DateRangePickerPrompts } from '@internal/ui/lib/date-range-picker/models/date-range-picker-prompts/date-range-picker-prompts.interface';

/**
 * Constant DATE_RANGE_PICKER_PROMPTS
 * @readonly
 *
 * @description
 * French source status lines of `ui-date-range-picker` (`@@ui.dateRangePicker.*`), the default of
 * its `prompts` input.
 *
 * @type {DateRangePickerPrompts}
 */
export const DATE_RANGE_PICKER_PROMPTS: DateRangePickerPrompts = {
  start: $localize`:@@ui.dateRangePicker.promptStart:Choisissez la date de début`,
  end: $localize`:@@ui.dateRangePicker.promptEnd:Choisissez la date de fin`,
};
