/**
 * Interface BilingualText
 * @interface BilingualText
 *
 * @description
 * French and English text values as edited in the administrator form.
 */
export interface BilingualText {
  // #region Properties
  /**
   * Property fr
   *
   * @description
   * French source text for the field or article section.
   *
   * @type {string}
   */
  fr: string;

  /**
   * Property en
   *
   * @description
   * English translation; an empty string means no translation has been entered.
   *
   * @type {string}
   */
  en: string;
  // #endregion
}
