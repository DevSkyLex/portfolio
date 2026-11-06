import type { TimelineEntryFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/timeline-entry-form/models/timeline-entry-form-values.model';
import {
  toTimelineFormModel,
  toTimelineFormValues,
} from '@internal/content-web-feature-admin/lib/utils/timeline-form-period/timeline-form-period.utils';

/**
 * Function values
 *
 * @description
 * Draft values with the given period fields.
 *
 * @param {Partial<TimelineEntryFormValues>} period - Period fields.
 *
 * @returns {TimelineEntryFormValues} Values.
 */
const values = (period: Partial<TimelineEntryFormValues>): TimelineEntryFormValues => ({
  title: { fr: 'Poste', en: 'Job' },
  place: { fr: 'Ville-Exemple', en: 'Ville-Exemple' },
  description: { fr: 'Texte.', en: 'Text.' },
  startMonth: null,
  startYear: null,
  ongoing: false,
  endMonth: null,
  endYear: null,
  techs: ['angular'],
  ...period,
});

describe('toTimelineFormModel', (): void => {
  it('joins the start and end months into a period, ongoing without an end', (): void => {
    expect(
      toTimelineFormModel(values({ startMonth: 9, startYear: 2023, endMonth: 6, endYear: 2026 }))
        .period,
    ).toEqual({ start: { year: 2023, month: 9 }, end: { year: 2026, month: 6 } });
    expect(
      toTimelineFormModel(values({ startMonth: 7, startYear: 2026, ongoing: true })).period,
    ).toEqual({ start: { year: 2026, month: 7 }, end: null });
  });

  it('gives no period to an empty or incomplete draft', (): void => {
    expect(toTimelineFormModel(values({})).period).toBeNull();
    expect(toTimelineFormModel(values({ startMonth: 7, startYear: 2026 })).period).toBeNull();
    expect(toTimelineFormModel(values({ startYear: 2026, ongoing: true })).period).toBeNull();
  });

  it('round-trips through the draft values', (): void => {
    for (const draft of [
      values({ startMonth: 9, startYear: 2023, endMonth: 6, endYear: 2026 }),
      values({ startMonth: 7, startYear: 2026, ongoing: true }),
      values({}),
    ]) {
      expect(toTimelineFormValues(toTimelineFormModel(draft))).toEqual(draft);
    }
  });
});
