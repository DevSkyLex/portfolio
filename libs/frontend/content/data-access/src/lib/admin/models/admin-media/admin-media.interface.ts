/**
 * Interface AdminMedia
 * @interface AdminMedia
 *
 * @description
 * Uploaded image as the administrator sees it: its id, the URL of its full WebP and its intrinsic size.
 */
export interface AdminMedia {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Media identifier (UUID) referenced by figures and the cover.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property kind
   * @readonly
   *
   * @description
   * `image` or `video` (D57); only an image can be a cover.
   */
  readonly kind: 'image' | 'video';

  /**
   * Property src
   * @readonly
   *
   * @description
   * Same-origin URL of the full WebP (`/media/<uuid>.webp`).
   *
   * @type {string}
   */
  readonly src: string;

  /**
   * Property width
   * @readonly
   *
   * @description
   * Intrinsic width in pixels.
   *
   * @type {number}
   */
  readonly width: number;

  /**
   * Property height
   * @readonly
   *
   * @description
   * Intrinsic height in pixels.
   *
   * @type {number}
   */
  readonly height: number;
  // #endregion
}
