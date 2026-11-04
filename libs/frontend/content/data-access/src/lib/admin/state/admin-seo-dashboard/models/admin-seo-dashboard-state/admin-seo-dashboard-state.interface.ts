import type { CallState } from '@vfortin/web-http';
import type {
  SeoDashboard,
  SeoRange,
} from '@internal/content-web-data-access/lib/admin/models/seo-dashboard/seo-dashboard.type';

/**
 * Interface AdminSeoDashboardState
 * @interface AdminSeoDashboardState
 *
 * @description
 * Dashboard last read, its window, the earliest time a refresh is accepted again, and the state of
 * each independent call.
 */
export interface AdminSeoDashboardState {
  // #region Properties
  /**
   * Property dashboard
   * @readonly
   *
   * @description
   * Dashboard of the last read, kept while another window loads; `null` before the first read.
   *
   * @type {SeoDashboard | null}
   */
  readonly dashboard: SeoDashboard | null;

  /**
   * Property range
   * @readonly
   *
   * @description
   * Window of the last read asked.
   *
   * @type {SeoRange}
   */
  readonly range: SeoRange;

  /**
   * Property retryAt
   * @readonly
   *
   * @description
   * Time (ISO) the API gave with its last 429, `null` without one.
   *
   * @type {string | null}
   */
  readonly retryAt: string | null;

  /**
   * Property loadCallState
   * @readonly
   *
   * @description
   * State of the read of a window.
   *
   * @type {CallState}
   */
  readonly loadCallState: CallState;

  /**
   * Property refreshCallState
   * @readonly
   *
   * @description
   * State of the last refresh request.
   *
   * @type {CallState}
   */
  readonly refreshCallState: CallState;

  /**
   * Property pollCallState
   * @readonly
   *
   * @description
   * State of the reads following a running refresh.
   *
   * @type {CallState}
   */
  readonly pollCallState: CallState;
  // #endregion
}
