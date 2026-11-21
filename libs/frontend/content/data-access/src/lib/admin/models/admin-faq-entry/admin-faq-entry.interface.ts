/**
 * Interface AdminFaqEntry
 * @interface AdminFaqEntry
 *
 * @description
 * Question of the FAQ and its plain-text answer as the administration shows them, independent of the
 * transport DTO.
 */
export interface AdminFaqEntry {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identifier.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property position
   * @readonly
   *
   * @description
   * Order within the FAQ, from 0.
   *
   * @type {number}
   */
  readonly position: number;

  /**
   * Property version
   * @readonly
   *
   * @description
   * Content version, sent in `If-Match` by a save or a deletion.
   *
   * @type {number}
   */
  readonly version: number;

  /**
   * Property question
   * @readonly
   *
   * @description
   * Question per language.
   *
   * @type {{ readonly fr: string; readonly en?: string }}
   */
  readonly question: { readonly fr: string; readonly en?: string };

  /**
   * Property answer
   * @readonly
   *
   * @description
   * Plain-text answer per language; its line breaks are kept.
   *
   * @type {{ readonly fr: string; readonly en?: string }}
   */
  readonly answer: { readonly fr: string; readonly en?: string };
  // #endregion
}
