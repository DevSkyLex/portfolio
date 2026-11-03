import type { CallState } from '@vfortin/web-http';

/**
 * Interface ContactFormState
 * @interface ContactFormState
 *
 * @description
 * Submission status and confirmation address owned by the contact form section.
 */
export interface ContactFormState {
  // #region Properties
  /**
   * Property sendCallState
   * @readonly
   *
   * @description
   * Call state used to report pending, successful, or failed contact submission.
   *
   * @type {CallState}
   */
  readonly sendCallState: CallState;

  /**
   * Property sentTo
   * @readonly
   *
   * @description
   * Trimmed email address from the last successful submission, shown in its confirmation.
   *
   * @type {string | null}
   */
  readonly sentTo: string | null;
  // #endregion
}
