import type { BilingualText } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/bilingual-text.interface';

/**
 * Interface TimelineEntryFormValues
 * @interface TimelineEntryFormValues
 *
 * @description
 * Values of the timeline entry form, the shape of `TimelineEntryDraft` that the data access converts
 * to a request: one text per language, each month as a month and a year choice (`null` until chosen),
 * « En cours » for an entry without end, and the technology keys.
 */
export interface TimelineEntryFormValues {
  // #region Properties
  /**
   * Property title
   *
   * @description
   * « Intitulé » per language.
   *
   * @type {BilingualText}
   */
  title: BilingualText;

  /**
   * Property place
   *
   * @description
   * « Lieu » per language.
   *
   * @type {BilingualText}
   */
  place: BilingualText;

  /**
   * Property description
   *
   * @description
   * « Description » per language.
   *
   * @type {BilingualText}
   */
  description: BilingualText;

  /**
   * Property startMonth
   *
   * @description
   * First month, 1 to 12.
   *
   * @type {number | null}
   */
  startMonth: number | null;

  /**
   * Property startYear
   *
   * @description
   * Year of the first month.
   *
   * @type {number | null}
   */
  startYear: number | null;

  /**
   * Property ongoing
   *
   * @description
   * « En cours »: no end.
   *
   * @type {boolean}
   */
  ongoing: boolean;

  /**
   * Property endMonth
   *
   * @description
   * Last month, 1 to 12.
   *
   * @type {number | null}
   */
  endMonth: number | null;

  /**
   * Property endYear
   *
   * @description
   * Year of the last month.
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
