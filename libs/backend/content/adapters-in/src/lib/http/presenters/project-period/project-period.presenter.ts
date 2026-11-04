import type { ContentLocale } from '@vfortin/content-contracts';
import type { ProjectPeriod, ProjectPeriodBound } from '@vfortin/content-domain';

/**
 * Constant MONTH_NAMES
 *
 * @description
 * Month names of each snapshot locale, January first: lower case in French, capitalized in English.
 */
const MONTH_NAMES: Readonly<Record<ContentLocale, readonly string[]>> = {
  fr: [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre',
  ],
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
};

/**
 * Constant SINCE
 *
 * @description
 * Word opening the label of an ongoing period.
 */
const SINCE: Readonly<Record<ContentLocale, string>> = { fr: 'Depuis', en: 'Since' };

/**
 * Constant DASH
 *
 * @description
 * Separator of the two bounds: an em dash between spaces, as the labels written before D46.
 */
const DASH: string = ' — ';

/**
 * Function boundLabel
 *
 * @description
 * One bound: the month and its year, or the year alone.
 *
 * @param {ProjectPeriodBound} bound - Bound.
 * @param {ContentLocale} locale - Locale.
 * @returns {string} « juillet 2026 », « 2023 ».
 */
function boundLabel(bound: ProjectPeriodBound, locale: ContentLocale): string {
  return bound.month === null
    ? `${bound.year}`
    : `${MONTH_NAMES[locale][bound.month - 1] ?? ''} ${bound.year}`;
}

/**
 * Function projectPeriodLabel
 *
 * @description
 * Public label of a project period in a snapshot locale (D46), the `periodLabel` of the snapshot:
 * « Depuis juillet 2026 » / « Since July 2026 » while ongoing, « 2023 » or « Mars 2023 » for one year
 * or month, « Mars — avril 2023 » when both months are in one year, else both bounds
 * (« 2023 — 2026 », « Septembre 2023 — juin 2026 »); the first letter is capitalized. In one year, a
 * whole-year bound beside a month reads as January or December (« Septembre — décembre 2023 »).
 *
 * @param {ProjectPeriod} period - Period of the project.
 * @param {ContentLocale} locale - Snapshot locale.
 * @returns {string} Label.
 */
export function projectPeriodLabel(period: ProjectPeriod, locale: ContentLocale): string {
  const { start, end } = period;
  let label: string;
  if (end === null) {
    label = `${SINCE[locale]} ${boundLabel(start, locale)}`;
  } else if (start.year !== end.year) {
    label = `${boundLabel(start, locale)}${DASH}${boundLabel(end, locale)}`;
  } else if (start.month === end.month) {
    label = boundLabel(start, locale);
  } else {
    const first: number = start.month ?? 1;
    const last: number = end.month ?? 12;
    label =
      first === last
        ? boundLabel({ year: end.year, month: last }, locale)
        : `${MONTH_NAMES[locale][first - 1] ?? ''}${DASH}${boundLabel({ year: end.year, month: last }, locale)}`;
  }
  return label.charAt(0).toUpperCase() + label.slice(1);
}
