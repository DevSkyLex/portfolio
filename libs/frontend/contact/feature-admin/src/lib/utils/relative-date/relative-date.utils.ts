import { RELATIVE_DATE_STEPS } from '@internal/contact-web-feature-admin/lib/constants/relative-date-steps.constants';

/**
 * Function relativeDate
 *
 * @description
 * Short French date of the inbox list, as in a mail client: "à l'instant" under a minute, then
 * "il y a 5 min", "il y a 3 h", "hier", up to six days, then the day and month (and the year when it is
 * not the current one).
 *
 * @param {string} iso - ISO 8601 instant of the message.
 * @param {number} now - Reference instant in milliseconds; the current time by default.
 *
 * @returns {string} The French label.
 */
export function relativeDate(iso: string, now: number = Date.now()): string {
  const date: Date = new Date(iso);
  let value: number = (date.getTime() - now) / 1000;
  if (Math.abs(value) < 60) {
    return 'à l’instant';
  }
  const format: Intl.RelativeTimeFormat = new Intl.RelativeTimeFormat('fr', {
    numeric: 'auto',
    style: 'short',
  });
  for (const step of RELATIVE_DATE_STEPS) {
    value /= step.size;
    if (Math.abs(Math.round(value)) < step.limit) {
      return format.format(Math.round(value), step.unit);
    }
  }
  const sameYear: boolean = date.getFullYear() === new Date(now).getFullYear();
  return new Intl.DateTimeFormat('fr', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date);
}
