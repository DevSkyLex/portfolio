/**
 * Interface ScrollFrameTask
 * @interface ScrollFrameTask
 *
 * @description
 * Defines the measurement and DOM-write phases registered with `ScrollFrameService`.
 */
export interface ScrollFrameTask {
  // #region Methods
  /**
   * Method read
   * @method read
   *
   * @description
   * Measures current layout during the shared read phase, before any task writes styles.
   *
   * @returns {void}
   */
  read(): void;

  /**
   * Method write
   * @method write
   *
   * @description
   * Applies the latest measurements and reports whether the DOM changed, which schedules a settling frame.
   *
   * @returns {boolean} `true` when a write changed the DOM and another frame may be needed.
   */
  write(): boolean;
  // #endregion
}
