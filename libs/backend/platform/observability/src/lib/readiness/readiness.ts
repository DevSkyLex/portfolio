/**
 * Interface ReadinessCheck
 * @interface ReadinessCheck
 *
 * @description
 * Describes a dependency probe registered by service composition and consumed by the readiness endpoint.
 */
export interface ReadinessCheck {
  // #region Properties
  /**
   * Property name
   * @readonly
   *
   * @description
   * Stable indicator key used in the readiness response and warning log.
   *
   * @type {string}
   */
  readonly name: string;
  // #endregion

  // #region Methods
  /**
   * Method check
   * @method check
   *
   * @description
   * Resolves when the dependency can serve requests and rejects when it is unavailable.
   *
   * @returns {Promise<void>} Completion of the dependency probe.
   */
  check(): Promise<void>;
  // #endregion
}

/**
 * Constant READINESS_CHECKS
 *
 * @description
 * Nest injection token for dependency probes supplied by each service composition.
 */
export const READINESS_CHECKS: unique symbol = Symbol('READINESS_CHECKS');
