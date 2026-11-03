import type { Signal } from '@angular/core';
import type { CallState } from '@vfortin/web-http';

/**
 * Class AdminInboxSummaryPort
 *
 * @description
 * Contact-owned unread-count capability; null means unknown, not zero unread messages.
 */
export abstract class AdminInboxSummaryPort {
  // #region Properties
  /**
   * Property count
   *
   * @description
   * Latest unread total; null distinguishes unknown or failed from successful zero.
   */
  public abstract readonly count: Signal<number | null>;

  /**
   * Property callState
   *
   * @description
   * Owner load lifecycle and retryable failure, independent from the numeric projection.
   */
  public abstract readonly callState: Signal<CallState>;
  // #endregion

  // #region Methods
  /**
   * Method refresh
   *
   * @description
   * Refreshes the projection while discarding superseded responses.
   *
   * @returns {Promise<void>} Completion after the request settles.
   */
  public abstract refresh(): Promise<void>;
  // #endregion
}
