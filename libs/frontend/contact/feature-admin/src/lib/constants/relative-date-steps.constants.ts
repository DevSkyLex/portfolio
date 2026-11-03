import type { RelativeDateStep } from '@internal/contact-web-feature-admin/lib/models/relative-date-step/relative-date-step.interface';

/**
 * Constant RELATIVE_DATE_STEPS
 *
 * @description
 * Units of the relative date, from seconds upwards. Past the last step the date is written out.
 *
 * @type {readonly RelativeDateStep[]}
 */
export const RELATIVE_DATE_STEPS: readonly RelativeDateStep[] = [
  { unit: 'minute', size: 60, limit: 60 },
  { unit: 'hour', size: 60, limit: 24 },
  { unit: 'day', size: 24, limit: 7 },
];
