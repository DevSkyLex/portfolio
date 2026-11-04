/**
 * Interface ConsentRecord
 * @interface ConsentRecord
 *
 * @description
 * Visitor's choice as stored in first-party `localStorage` under `CONSENT_STORAGE_KEY` (D48): never
 * sent to a server, kept until `CONSENT_LIFETIME_MONTHS` after `decidedAt`.
 */
export interface ConsentRecord {
  // #region Properties
  /**
   * Property version
   * @readonly
   *
   * @description
   * Format of the record; a record of another version is asked again.
   *
   * @type {number}
   */
  readonly version: number;

  /**
   * Property analytics
   * @readonly
   *
   * @description
   * Whether the audience measurement (Google Analytics) is accepted.
   *
   * @type {boolean}
   */
  readonly analytics: boolean;

  /**
   * Property decidedAt
   * @readonly
   *
   * @description
   * ISO date-time of the choice.
   *
   * @type {string}
   */
  readonly decidedAt: string;
  // #endregion
}
