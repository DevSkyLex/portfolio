/**
 * Interface ProjectSeo
 * @interface ProjectSeo
 *
 * @description
 * Search title, description and keywords of a loaded project in each language; an absent text or an
 * empty list means the public page falls back on the project title, summary or technologies.
 */
export interface ProjectSeo {
  // #region Properties
  /**
   * Property title
   * @readonly
   *
   * @description
   * Custom search titles, by language.
   *
   * @type {{ readonly fr?: string; readonly en?: string }}
   */
  readonly title: { readonly fr?: string; readonly en?: string };

  /**
   * Property description
   * @readonly
   *
   * @description
   * Custom search descriptions, by language.
   *
   * @type {{ readonly fr?: string; readonly en?: string }}
   */
  readonly description: { readonly fr?: string; readonly en?: string };

  /**
   * Property keywords
   * @readonly
   *
   * @description
   * Custom keywords, by language, empty when none was written (the public page then writes the
   * project technologies).
   *
   * @type {{ readonly fr: readonly string[]; readonly en: readonly string[] }}
   */
  readonly keywords: { readonly fr: readonly string[]; readonly en: readonly string[] };
  // #endregion
}
