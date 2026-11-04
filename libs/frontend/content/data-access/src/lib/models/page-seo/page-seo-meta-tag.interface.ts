/**
 * Interface PageSeoMetaTag
 * @interface PageSeoMetaTag
 *
 * @description
 * One `<meta>` element of a public page's head (D42), as `PageSeoService` writes it and the
 * administrator editor lists it.
 */
export interface PageSeoMetaTag {
  // #region Properties
  /**
   * Property attribute
   * @readonly
   *
   * @description
   * Attribute naming the tag: `property` for Open Graph, `name` for the others.
   *
   * @type {'name' | 'property'}
   */
  readonly attribute: 'name' | 'property';

  /**
   * Property key
   * @readonly
   *
   * @description
   * Value of that attribute, such as `og:title` or `twitter:card`.
   *
   * @type {string}
   */
  readonly key: string;

  /**
   * Property content
   * @readonly
   *
   * @description
   * Value of the `content` attribute.
   *
   * @type {string}
   */
  readonly content: string;
  // #endregion
}
