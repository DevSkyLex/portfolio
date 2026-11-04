/**
 * Interface SeoPreview
 * @interface SeoPreview
 *
 * @description
 * One language's project page as a search result would list it, from the current form values.
 */
export interface SeoPreview {
  // #region Properties
  /**
   * Property title
   * @readonly
   *
   * @description
   * Custom search title, or the project title followed by the site name.
   *
   * @type {string}
   */
  readonly title: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Custom search description, or the project summary, cut like a search snippet.
   *
   * @type {string}
   */
  readonly description: string;

  /**
   * Property breadcrumb
   * @readonly
   *
   * @description
   * Host and path segments of the public page, joined with `›` as a search result writes them.
   *
   * @type {string}
   */
  readonly breadcrumb: string;
  // #endregion
}
