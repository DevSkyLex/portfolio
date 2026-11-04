import type { SeoFormatter } from '@internal/content-web-feature-admin/lib/models/seo-formatter/seo-formatter.interface';

/**
 * Function utcDay
 *
 * @description
 * Midnight UTC of a calendar day `YYYY-MM-DD`.
 *
 * @param {string} isoDay - Calendar day.
 *
 * @returns {Date} Instant formatted in UTC.
 */
function utcDay(isoDay: string): Date {
  return new Date(`${isoDay}T00:00:00Z`);
}

/**
 * Function seoFormatter
 *
 * @description
 * Builds the dashboard formatters of a build locale (`fr`, `en`), each `Intl` format created once.
 *
 * @param {string} locale - Build locale (`LOCALE_ID`).
 *
 * @returns {SeoFormatter} Formatters.
 */
export function seoFormatter(locale: string): SeoFormatter {
  const count: Intl.NumberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const compact: Intl.NumberFormat = new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  const percent: Intl.NumberFormat = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  });
  const signedPercent: Intl.NumberFormat = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  });
  const decimal: Intl.NumberFormat = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const signedDecimal: Intl.NumberFormat = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  });
  const shift: Intl.NumberFormat = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const minutes: Intl.NumberFormat = new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'minute',
    unitDisplay: 'short',
  });
  const wholeSeconds: Intl.NumberFormat = new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'second',
    unitDisplay: 'short',
    maximumFractionDigits: 0,
  });
  const seconds: Intl.NumberFormat = new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'second',
    unitDisplay: 'short',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const milliseconds: Intl.NumberFormat = new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'millisecond',
    unitDisplay: 'short',
    maximumFractionDigits: 0,
  });
  const day: Intl.DateTimeFormat = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const span: Intl.DateTimeFormat = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const dateTime: Intl.DateTimeFormat = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const time: Intl.DateTimeFormat = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });
  return {
    count: (value: number): string => count.format(value),
    compact: (value: number): string => compact.format(value),
    percent: (ratio: number): string => percent.format(ratio),
    signedPercent: (ratio: number): string => signedPercent.format(ratio),
    decimal: (value: number): string => decimal.format(value),
    signedDecimal: (value: number): string => signedDecimal.format(value),
    duration: (value: number): string => {
      const total: number = Math.max(0, Math.round(value));
      const whole: number = Math.floor(total / 60);
      const rest: number = total % 60;
      if (whole === 0) return wholeSeconds.format(rest);
      return rest === 0
        ? minutes.format(whole)
        : `${minutes.format(whole)} ${wholeSeconds.format(rest)}`;
    },
    seconds: (value: number): string => seconds.format(value / 1000),
    milliseconds: (value: number): string => milliseconds.format(value),
    shift: (value: number): string => shift.format(value),
    day: (isoDay: string): string => day.format(utcDay(isoDay)),
    span: (start: string, end: string): string => span.formatRange(utcDay(start), utcDay(end)),
    dateTime: (iso: string): string => dateTime.format(new Date(iso)),
    time: (iso: string): string => time.format(new Date(iso)),
  };
}
