import type { GlyphShape } from '@vfortin/ui';

/**
 * Interface HeroLetter
 * @interface HeroLetter
 *
 * @description
 * One letter of the hero name with the glyph that rolls up into it (mockup slot animation).
 */
export interface HeroLetter {
  // #region Properties
  /**
   * Property char
   * @readonly
   *
   * @description
   * Letter displayed once the slot animation ends.
   *
   * @type {string}
   */
  readonly char: string;

  /**
   * Property k
   * @readonly
   *
   * @description
   * Position of the letter across the whole name, used as the `--k` stagger index.
   *
   * @type {number}
   */
  readonly k: number;

  /**
   * Property shape
   * @readonly
   *
   * @description
   * Glyph shown before the letter, cycling dot, cross and square along the name.
   *
   * @type {GlyphShape}
   */
  readonly shape: GlyphShape;

  /**
   * Property color
   * @readonly
   *
   * @description
   * Aurora text class of the glyph, cycling within each word.
   *
   * @type {string}
   */
  readonly color: string;
  // #endregion
}
