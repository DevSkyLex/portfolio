import { InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';

/**
 * Constant LOCALES
 *
 * @description
 * Locales supported by the content model and ordered as French source followed by English.
 */
export const LOCALES: readonly ['fr', 'en'] = ['fr', 'en'] as const;

/**
 * Type Locale
 * @type Locale
 *
 * @description
 * One of the locales supported by the public portfolio content.
 */
export type Locale = (typeof LOCALES)[number];

/**
 * Constant SOURCE_LOCALE
 *
 * @description
 * Locale in which source content is authored and required for every localized field.
 */
export const SOURCE_LOCALE: Locale = 'fr';

/**
 * Interface LocalizedTextProps
 * @interface LocalizedTextProps
 *
 * @description
 * Input translations for a localized field; French is required and English may be omitted.
 */
export interface LocalizedTextProps {
  // #region Properties
  /**
   * Property fr
   * @readonly
   *
   * @description
   * Required French source text; blank content is rejected after trimming.
   */
  readonly fr: string;

  /**
   * Property en
   * @readonly
   *
   * @description
   * Optional English translation; blank content is normalized to missing.
   */
  readonly en?: string;
  // #endregion
}

/**
 * Class LocalizedText
 * @class LocalizedText
 *
 * @description
 * Stores trimmed French and optional English text, with French fallback until English is present.
 */
export class LocalizedText {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores normalized translations created by the `of` factory.
   *
   * @param {string} fr - Nonblank French source text.
   * @param {string | undefined} en - Trimmed English text, or `undefined` when absent.
   */
  private constructor(
    public readonly fr: string,
    public readonly en: string | undefined,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method of
   * @method of
   *
   * @description
   * Trims both translations, rejects an empty French value and treats blank English as missing.
   *
   * @param {string} field - Field label included in validation errors.
   * @param {LocalizedTextProps} props - Translation input.
   * @returns {LocalizedText} Normalized bilingual value.
   */
  public static of(field: string, props: LocalizedTextProps): LocalizedText {
    const fr: string = props.fr.trim();
    if (fr === '') {
      throw new InvalidValueError(field, 'the French text is required');
    }
    const en: string | undefined = props.en?.trim();
    return new LocalizedText(fr, en === '' ? undefined : en);
  }

  /**
   * Method in
   * @method in
   *
   * @description
   * Returns English when requested and available, otherwise uses the required French source text.
   *
   * @param {Locale} locale - Requested locale.
   * @returns {string} Text selected for display.
   */
  public in(locale: Locale): string {
    return locale === 'en' ? (this.en ?? this.fr) : this.fr;
  }

  /**
   * Method isCompleteFor
   * @method isCompleteFor
   *
   * @description
   * Checks whether a translation exists for the requested locale; French is always complete.
   *
   * @param {Locale} locale - Locale required by the publication operation.
   * @returns {boolean} Whether the value has content for that locale.
   */
  public isCompleteFor(locale: Locale): boolean {
    return locale === 'fr' || this.en !== undefined;
  }

  /**
   * Method toProps
   * @method toProps
   *
   * @description
   * Converts the value to input properties while omitting a missing English translation.
   *
   * @returns {LocalizedTextProps} Serializable translation fields.
   */
  public toProps(): LocalizedTextProps {
    return this.en === undefined ? { fr: this.fr } : { fr: this.fr, en: this.en };
  }
  // #endregion
}
