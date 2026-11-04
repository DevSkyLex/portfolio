/**
 * Interface PageSeo
 * @interface PageSeo
 *
 * @description
 * Resolved head metadata of one public page (D42): every address is absolute and locale-specific, so
 * `PageSeoService` writes the values as they are.
 */
export interface PageSeo {
  // #region Properties
  /**
   * Property title
   * @readonly
   *
   * @description
   * Document title, also the Open Graph and Twitter title.
   *
   * @type {string}
   */
  readonly title: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Meta description, also the Open Graph and Twitter description.
   *
   * @type {string}
   */
  readonly description: string;

  /**
   * Property keywords
   * @readonly
   *
   * @description
   * Keywords of `<meta name="keywords">`, also joined into the JSON-LD `keywords`; empty on a page
   * without any, where the tag is removed.
   *
   * @type {readonly string[]}
   */
  readonly keywords: readonly string[];

  /**
   * Property canonical
   * @readonly
   *
   * @description
   * Absolute address of the page in its own locale, written to `link rel=canonical` and `og:url`.
   *
   * @type {string}
   */
  readonly canonical: string;

  /**
   * Property alternates
   * @readonly
   *
   * @description
   * `link rel=alternate` entries: `fr`, `en` and `x-default` (the French page).
   *
   * @type {readonly { readonly hreflang: string; readonly href: string }[]}
   */
  readonly alternates: readonly { readonly hreflang: string; readonly href: string }[];

  /**
   * Property type
   * @readonly
   *
   * @description
   * Open Graph object type: `website` for the home page, `article` for a case study.
   *
   * @type {'website' | 'article'}
   */
  readonly type: 'website' | 'article';

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Open Graph locale of the page (`fr_FR` or `en_GB`).
   *
   * @type {string}
   */
  readonly locale: string;

  /**
   * Property alternateLocale
   * @readonly
   *
   * @description
   * Open Graph locale of the other language version.
   *
   * @type {string}
   */
  readonly alternateLocale: string;

  /**
   * Property image
   * @readonly
   *
   * @description
   * Absolute share image with its intrinsic size and alternative text, or `null` without a cover (the
   * Twitter card is then `summary`).
   *
   * @type {{ readonly url: string; readonly width: number; readonly height: number; readonly alt: string } | null}
   */
  readonly image: {
    readonly url: string;
    readonly width: number;
    readonly height: number;
    readonly alt: string;
  } | null;

  /**
   * Property structuredData
   * @readonly
   *
   * @description
   * schema.org object written to a `script type="application/ld+json"` data block, or `null`.
   *
   * @type {Readonly<Record<string, unknown>> | null}
   */
  readonly structuredData: Readonly<Record<string, unknown>> | null;
  // #endregion
}
