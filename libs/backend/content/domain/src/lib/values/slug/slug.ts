import { InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';

/**
 * Constant SLUG
 *
 * @description
 * Pattern requiring lowercase ASCII letters or digits separated by single hyphens.
 */
const SLUG: RegExp = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Class Slug
 * @class Slug
 *
 * @description
 * Validated URL identifier containing lowercase ASCII letters, digits and single hyphen separators.
 */
export class Slug {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores a slug after the public factory has validated its format and length.
   *
   * @param {string} value - Lowercase URL-safe identifier, at most 80 characters.
   */
  private constructor(public readonly value: string) {}
  // #endregion

  // #region Methods
  /**
   * Method fromTitle
   * @method fromTitle
   *
   * @description
   * Derives a slug from a title: accents dropped, lowercase, every run of other characters turned into
   * one hyphen, cut to leave room for a suffix. A slug already taken gets the first free `-2`, `-3`…
   * suffix; a title with no letter or digit falls back on `projet`.
   *
   * @param {string} title - Source title.
   * @param {ReadonlySet<string>} taken - Slugs already in use.
   * @returns {Slug} Free slug.
   */
  public static fromTitle(title: string, taken: ReadonlySet<string>): Slug {
    const base: string =
      title
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 72)
        .replace(/^-+|-+$/g, '') || 'projet';
    let candidate: string = base;
    for (let suffix: number = 2; taken.has(candidate); suffix++) {
      candidate = `${base}-${suffix}`;
    }
    return Slug.of(candidate);
  }

  /**
   * Method of
   * @method of
   *
   * @description
   * Validates and creates a slug; throws `InvalidValueError` when the value is too long or does
   * not match the lowercase letters, digits and single-hyphen format.
   *
   * @param {string} value - Candidate slug.
   * @returns {Slug} Validated slug value object.
   */
  public static of(value: string): Slug {
    if (value.length > 80 || !SLUG.test(value)) {
      throw new InvalidValueError('slug', `"${value}" is not a valid slug`);
    }
    return new Slug(value);
  }

  /**
   * Method equals
   * @method equals
   *
   * @description
   * Compares slugs by their validated string value.
   *
   * @param {Slug} other - Slug to compare.
   * @returns {boolean} Whether both values identify the same slug.
   */
  public equals(other: Slug): boolean {
    return other.value === this.value;
  }
  // #endregion
}
