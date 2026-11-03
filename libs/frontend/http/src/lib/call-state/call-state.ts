import type { StoreError } from '@internal/web-http/lib/errors/store-error/store-error';

/**
 * Type CallStatus
 * @type CallStatus
 *
 * @description
 * Lifecycle state shared by independent asynchronous operations in a store.
 *
 * @type {'idle' | 'pending' | 'success' | 'error'}
 */
export type CallStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * Interface CallState
 * @interface CallState
 *
 * @description
 * Status and normalized failure for one named asynchronous store operation.
 */
export interface CallState {
  // #region Properties
  /**
   * Property status
   * @readonly
   *
   * @description
   * Current lifecycle state of the operation.
   *
   * @type {CallStatus}
   */
  readonly status: CallStatus;

  /**
   * Property error
   * @readonly
   *
   * @description
   * Normalized failure for an error state; `null` for idle, pending, and success states.
   *
   * @type {StoreError | null}
   */
  readonly error: StoreError | null;
  // #endregion
}

/**
 * Function idleCallState
 *
 * @description
 * Creates the initial state for a store operation before a request starts.
 *
 * @returns {CallState} Idle state with no stored error.
 */
export const idleCallState = (): CallState => ({ status: 'idle', error: null });

/**
 * Function pendingCallState
 *
 * @description
 * Creates the state used while a store operation is in progress.
 *
 * @returns {CallState} Pending state with no stored error.
 */
export const pendingCallState = (): CallState => ({ status: 'pending', error: null });

/**
 * Function successCallState
 *
 * @description
 * Creates the completed state for a successful store operation.
 *
 * @returns {CallState} Success state with no stored error.
 */
export const successCallState = (): CallState => ({ status: 'success', error: null });

/**
 * Function errorCallState
 *
 * @description
 * Creates the failed state that retains the normalized error for presentation or retry handling.
 *
 * @param {StoreError} error - Normalized failure produced by the shared HTTP error adapter.
 *
 * @returns {CallState} Error state containing the supplied failure.
 */
export const errorCallState = (error: StoreError): CallState => ({ status: 'error', error });
