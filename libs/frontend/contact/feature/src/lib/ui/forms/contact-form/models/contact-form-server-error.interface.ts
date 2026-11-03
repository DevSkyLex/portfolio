/** Field-scoped submission failure presented until that input changes. */
export interface ContactFormServerError {
  /**
   * Property field
   *
   * @description
   * Submitted field name associated with the rejection.
   *
   * @type {string}
   */
  readonly field: string;

  /**
   * Property message
   *
   * @description
   * Plain message body.
   *
   * @type {string}
   */
  readonly message: string;
}
