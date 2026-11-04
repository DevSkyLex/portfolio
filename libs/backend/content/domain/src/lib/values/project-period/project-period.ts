import { InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';

/**
 * Constant PROJECT_PERIOD_LIMITS
 *
 * @description
 * Accepted years of a project period, those of the timeline entries; the contract and the admin form
 * keep a copy (D10, D46).
 */
export const PROJECT_PERIOD_LIMITS = { yearMin: 1990, yearMax: 2100 } as const;

/**
 * Interface ProjectPeriodBound
 * @interface ProjectPeriodBound
 *
 * @description
 * One end of a project period: a year, with a month or for the whole year.
 */
export interface ProjectPeriodBound {
  // #region Properties
  /**
   * Property year
   * @readonly
   *
   * @description
   * Four-digit year within `PROJECT_PERIOD_LIMITS`.
   */
  readonly year: number;

  /**
   * Property month
   * @readonly
   *
   * @description
   * One-based month (1 for January), or `null` when the bound is the whole year.
   */
  readonly month: number | null;
  // #endregion
}

/**
 * Interface ProjectPeriodProps
 * @interface ProjectPeriodProps
 *
 * @description
 * Persisted shape of a project period.
 */
export interface ProjectPeriodProps {
  // #region Properties
  /**
   * Property start
   * @readonly
   *
   * @description
   * First month or year.
   */
  readonly start: ProjectPeriodBound;

  /**
   * Property end
   * @readonly
   *
   * @description
   * Last month or year, inclusive, or `null` while the project is ongoing.
   */
  readonly end: ProjectPeriodBound | null;
  // #endregion
}

/**
 * Class ProjectPeriod
 * @class ProjectPeriod
 *
 * @description
 * Period of a project (D46). Unlike the timeline `Period`, which requires months, each bound may be
 * a whole year, and the two bounds may differ in precision; the public label is written from it by
 * the snapshot presenter.
 */
export class ProjectPeriod {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores validated bounds; callers create instances through `of`.
   *
   * @param {ProjectPeriodBound} start - First month or year.
   * @param {ProjectPeriodBound | null} end - Last month or year, or `null` while ongoing.
   */
  private constructor(
    public readonly start: ProjectPeriodBound,
    public readonly end: ProjectPeriodBound | null,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method of
   * @method of
   *
   * @description
   * Validates both bounds and refuses an end before the start: an earlier year, or an earlier month
   * of the same year when both bounds have one. The bounds are copied.
   *
   * @param {ProjectPeriodProps} props - Start and end.
   * @returns {ProjectPeriod} Validated period.
   * @throws {InvalidValueError} On a year or month out of range, or an end before the start.
   */
  public static of(props: ProjectPeriodProps): ProjectPeriod {
    const start: ProjectPeriodBound = ProjectPeriod.bound('period.start', props.start);
    const end: ProjectPeriodBound | null =
      props.end === null ? null : ProjectPeriod.bound('period.end', props.end);
    if (
      end !== null &&
      (end.year < start.year ||
        (end.year === start.year &&
          end.month !== null &&
          start.month !== null &&
          end.month < start.month))
    ) {
      throw new InvalidValueError('period.end', 'the end precedes the start');
    }
    return new ProjectPeriod(start, end);
  }

  /**
   * Method isOngoing
   * @method isOngoing
   *
   * @description
   * Reports whether the period has no end.
   *
   * @returns {boolean} `true` while ongoing.
   */
  public isOngoing(): boolean {
    return this.end === null;
  }

  /**
   * Method toProps
   * @method toProps
   *
   * @description
   * Returns a copy of the bounds for adapters.
   *
   * @returns {ProjectPeriodProps} Start and end.
   */
  public toProps(): ProjectPeriodProps {
    return { start: { ...this.start }, end: this.end === null ? null : { ...this.end } };
  }

  /**
   * Method bound
   * @method bound
   *
   * @description
   * Validates one bound and copies it.
   *
   * @param {string} field - Path reported in the error.
   * @param {ProjectPeriodBound} value - Bound to validate.
   * @returns {ProjectPeriodBound} Copy of the bound.
   * @throws {InvalidValueError} On a year or month out of range.
   */
  private static bound(field: string, value: ProjectPeriodBound): ProjectPeriodBound {
    const { yearMin, yearMax } = PROJECT_PERIOD_LIMITS;
    if (!Number.isInteger(value.year) || value.year < yearMin || value.year > yearMax) {
      throw new InvalidValueError(
        field,
        `${value.year} is not a year from ${yearMin} to ${yearMax}`,
      );
    }
    if (
      value.month !== null &&
      (!Number.isInteger(value.month) || value.month < 1 || value.month > 12)
    ) {
      throw new InvalidValueError(field, `${value.month} is not a month`);
    }
    return { year: value.year, month: value.month };
  }
  // #endregion
}
