import type { Period } from '@vfortin/ui';
import type { TimelineEntryFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/timeline-entry-form/models/timeline-entry-form-values.model';

/**
 * Type TimelineEntryFormModel
 *
 * @description
 * Model of the timeline entry Signal Form: the values with their five period fields (start month
 * and year, « En cours », end month and year) replaced by the one `period` of `ui-period-picker`.
 */
export type TimelineEntryFormModel = Omit<
  TimelineEntryFormValues,
  'startMonth' | 'startYear' | 'ongoing' | 'endMonth' | 'endYear'
> & {
  /**
   * Property period
   *
   * @description
   * Months of the entry, with a `null` end while it is ongoing; `null` until chosen.
   *
   * @type {Period | null}
   */
  period: Period | null;
};
