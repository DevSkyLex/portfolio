import { InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';

/**
 * Interface YearMonth
 * @interface YearMonth
 *
 * @description
 * Calendar month represented with a four-digit year and a one-based month number.
 */
export interface YearMonth {
  // #region Properties
  /**
   * Property year
   * @readonly
   *
   * @description
   * Calendar year accepted by `Period`, from 1990 through 2100 inclusive.
   */
  readonly year: number;

  /**
   * Property month
   * @readonly
   *
   * @description
   * One-based calendar month from 1 (January) through 12 (December).
   */
  readonly month: number;
  // #endregion
}

/**
 * Class Period
 * @class Period
 *
 * @description
 * Calendar interval with month precision; a missing end marks an ongoing activity.
 */
export class Period {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores validated start and end months; callers create instances through `of`.
   *
   * @param {YearMonth} start - Inclusive first month.
   * @param {YearMonth | null} end - Inclusive final month, or `null` while ongoing.
   */
  private constructor(
    public readonly start: YearMonth,
    public readonly end: YearMonth | null,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method of
   * @method of
   *
   * @description
   * Validates year and month bounds and rejects an end month earlier than the start.
   *
   * @param {YearMonth} start - Inclusive first month.
   * @param {YearMonth | null} end - Inclusive final month, or `null` for ongoing.
   * @returns {Period} Validated calendar interval.
   */
  public static of(start: YearMonth, end: YearMonth | null): Period {
    Period.assertValid('period.start', start);
    if (end !== null) {
      Period.assertValid('period.end', end);
      if (Period.index(end) < Period.index(start)) {
        throw new InvalidValueError('period', 'the end precedes the start');
      }
    }
    return new Period(start, end);
  }

  /**
   * Method isOngoing
   * @method isOngoing
   *
   * @description
   * Reports whether the interval has no end month.
   *
   * @returns {boolean} `true` when the period is ongoing.
   */
  public isOngoing(): boolean {
    return this.end === null;
  }

  /**
   * Method compareTo
   * @method compareTo
   *
   * @description
   * Orders periods by start month, then by end month when starts match; at the same start, an ongoing period sorts after a bounded period.
   *
   * @param {Period} other - Period compared with this one.
   * @returns {number} Negative, zero or positive according to chronological order.
   */
  public compareTo(other: Period): number {
    const byStart: number = Period.index(this.start) - Period.index(other.start);
    if (byStart !== 0) {
      return byStart;
    }
    if (this.end === null || other.end === null) {
      // Two ongoing periods are equal (Infinity - Infinity would give NaN).
      return (this.end === null ? 1 : 0) - (other.end === null ? 1 : 0);
    }
    return Period.index(this.end) - Period.index(other.end);
  }

  /**
   * Method index
   * @method index
   *
   * @description
   * Maps a year and one-based month to a monotonically increasing month index.
   *
   * @param {YearMonth} value - Month to map.
   * @returns {number} Month index used for ordering.
   */
  private static index(value: YearMonth): number {
    return value.year * 12 + (value.month - 1);
  }

  /**
   * Method assertValid
   * @method assertValid
   *
   * @description
   * Rejects months outside the supported calendar bounds with the supplied field name.
   *
   * @param {string} field - Field label included in the validation error.
   * @param {YearMonth} value - Month to validate.
   * @returns {void} Completes when the month is within the supported bounds.
   */
  private static assertValid(field: string, value: YearMonth): void {
    const valid: boolean =
      Number.isInteger(value.year) &&
      value.year >= 1990 &&
      value.year <= 2100 &&
      Number.isInteger(value.month) &&
      value.month >= 1 &&
      value.month <= 12;
    if (!valid) {
      throw new InvalidValueError(field, `${value.year}-${value.month} is not a valid month`);
    }
  }
  // #endregion
}
