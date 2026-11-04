import type { Period, PeriodBound } from '@vfortin/ui';
import type { TimelineEntryFormModel } from '@internal/content-web-feature-admin/lib/ui/forms/timeline-entry-form/models/timeline-entry-form-model.model';
import type { TimelineEntryFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/timeline-entry-form/models/timeline-entry-form-values.model';

/**
 * Function toTimelineFormModel
 *
 * @description
 * Form model of draft values: the start and end months become one period, ongoing when « En cours »
 * is set. A start or a non-ongoing end with a missing part gives no period (an empty draft).
 *
 * @param {TimelineEntryFormValues} values - Draft values.
 *
 * @returns {TimelineEntryFormModel} Form model, a copy.
 */
export function toTimelineFormModel(values: TimelineEntryFormValues): TimelineEntryFormModel {
  const { startMonth, startYear, ongoing, endMonth, endYear, ...rest } = structuredClone(values);
  const start: PeriodBound | null =
    startYear !== null && startMonth !== null ? { year: startYear, month: startMonth } : null;
  const end: PeriodBound | null =
    endYear !== null && endMonth !== null ? { year: endYear, month: endMonth } : null;
  const period: Period | null =
    start && (ongoing || end) ? { start, end: ongoing ? null : end } : null;
  return { ...rest, period };
}

/**
 * Function toTimelineFormValues
 *
 * @description
 * Draft values of the form model, the inverse of `toTimelineFormModel`.
 *
 * @param {TimelineEntryFormModel} model - Form model.
 *
 * @returns {TimelineEntryFormValues} Draft values, a copy.
 */
export function toTimelineFormValues(model: TimelineEntryFormModel): TimelineEntryFormValues {
  const { period, ...rest } = structuredClone(model);
  return {
    ...rest,
    startMonth: period?.start.month ?? null,
    startYear: period?.start.year ?? null,
    ongoing: period !== null && period.end === null,
    endMonth: period?.end?.month ?? null,
    endYear: period?.end?.year ?? null,
  };
}
