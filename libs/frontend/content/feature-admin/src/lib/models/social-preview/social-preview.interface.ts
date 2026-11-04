/**
 * Interface SocialPreview
 * @interface SocialPreview
 *
 * @description
 * One language's project page as a link card on a social network shows it, from the Open Graph values
 * the page will emit.
 */
export interface SocialPreview {
  // #region Properties
  /**
   * Property domain
   * @readonly
   *
   * @description
   * Host of the public site, as the card's source line.
   *
   * @type {string}
   */
  readonly domain: string;

  /**
   * Property title
   * @readonly
   *
   * @description
   * `og:title` of the page.
   *
   * @type {string}
   */
  readonly title: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * `og:description` of the page.
   *
   * @type {string}
   */
  readonly description: string;

  /**
   * Property image
   * @readonly
   *
   * @description
   * Cover displayed by the editor (its same-origin address, not the absolute `og:image`), or `null`
   * without one, where the card shows a neutral placeholder.
   *
   * @type {{ readonly src: string; readonly alt: string } | null}
   */
  readonly image: { readonly src: string; readonly alt: string } | null;
  // #endregion
}
