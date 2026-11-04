import type { SeoSourceError } from '@vfortin/content-web-data-access/admin';

/**
 * Interface SeoSectionView
 * @interface SeoSectionView
 *
 * @description
 * One Google section of the dashboard flattened for its template: what to show (`data`, the last
 * good report, kept beside a failure), when it was fetched, and what blocks it (missing settings, no
 * refresh yet, the last attempt's failure).
 *
 * @template T - Report type.
 */
export interface SeoSectionView<T> {
  // #region Properties
  /**
   * Property status
   * @readonly
   *
   * @description
   * Section status as the API answers it.
   *
   * @type {'not-configured' | 'pending' | 'ok' | 'error'}
   */
  readonly status: 'not-configured' | 'pending' | 'ok' | 'error';

  /**
   * Property data
   * @readonly
   *
   * @description
   * Report to show, `null` without one.
   *
   * @type {T | null}
   */
  readonly data: T | null;

  /**
   * Property fetchedAt
   * @readonly
   *
   * @description
   * Time of the report shown, `null` without one.
   *
   * @type {string | null}
   */
  readonly fetchedAt: string | null;

  /**
   * Property error
   * @readonly
   *
   * @description
   * Failure of the last attempt, `null` unless the status is `error`.
   *
   * @type {SeoSourceError | null}
   */
  readonly error: SeoSourceError | null;

  /**
   * Property attemptedAt
   * @readonly
   *
   * @description
   * Time of the failed attempt, `null` unless the status is `error`.
   *
   * @type {string | null}
   */
  readonly attemptedAt: string | null;

  /**
   * Property missing
   * @readonly
   *
   * @description
   * Environment variables still to set, empty unless the status is `not-configured`.
   *
   * @type {readonly string[]}
   */
  readonly missing: readonly string[];
  // #endregion
}
