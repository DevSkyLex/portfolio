import type { BilingualText } from '@internal/content-web-data-access/lib/admin/models/bilingual-text/bilingual-text.interface';

/**
 * Interface TimelineEntryDraft
 * @interface TimelineEntryDraft
 *
 * @description
 * Entry as the administration form edits it: one text per language (an empty English text means
 * none), each month as a month and a year choice (`null` until chosen), and « En cours » for an entry
 * without end.
 */
export interface TimelineEntryDraft {
  // #region Properties
  /**
   * Property title
   *
   * @description
   * Title per language.
   *
   * @type {BilingualText}
   */
  title: BilingualText;

  /**
   * Property place
   *
   * @description
   * Place per language.
   *
   * @type {BilingualText}
   */
  place: BilingualText;

  /**
   * Property description
   *
   * @description
   * Description per language.
   *
   * @type {BilingualText}
   */
  description: BilingualText;

  /**
   * Property startMonth
   *
   * @description
   * First month, 1 to 12, or `null` before a choice.
   *
   * @type {number | null}
   */
  startMonth: number | null;

  /**
   * Property startYear
   *
   * @description
   * Year of the first month, or `null` before a choice.
   *
   * @type {number | null}
   */
  startYear: number | null;

  /**
   * Property ongoing
   *
   * @description
   * « En cours »: the entry has no end and the end choices are ignored.
   *
   * @type {boolean}
   */
  ongoing: boolean;

  /**
   * Property endMonth
   *
   * @description
   * Last month, or `null`.
   *
   * @type {number | null}
   */
  endMonth: number | null;

  /**
   * Property endYear
   *
   * @description
   * Year of the last month, or `null`.
   *
   * @type {number | null}
   */
  endYear: number | null;

  /**
   * Property techs
   *
   * @description
   * Technology keys.
   *
   * @type {string[]}
   */
  techs: string[];
  // #endregion
}
