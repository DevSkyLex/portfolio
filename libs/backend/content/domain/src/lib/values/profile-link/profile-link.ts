import { InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';

/**
 * Constant PROFILE_LINK_KINDS
 *
 * @description
 * Closed set of public link kinds, each shown with its own icon by the site; `website` covers any
 * other page and is named by its label.
 */
export const PROFILE_LINK_KINDS: readonly ['email', 'github', 'linkedin', 'malt', 'website'] = [
  'email',
  'github',
  'linkedin',
  'malt',
  'website',
] as const;

/**
 * Type ProfileLinkKind
 * @type ProfileLinkKind
 *
 * @description
 * Kind of a public link.
 */
export type ProfileLinkKind = (typeof PROFILE_LINK_KINDS)[number];

/**
 * Constant PROFILE_LINK_LIMITS
 *
 * @description
 * Longest trimmed address and label of a link; mirrored by `PROFILE_LIMITS.linkUrl` and `linkLabel`
 * in the content contracts.
 */
export const PROFILE_LINK_LIMITS: { readonly url: 300; readonly label: 40 } = {
  url: 300,
  label: 40,
} as const;

/**
 * Constant MAILTO
 *
 * @description
 * `mailto:` followed by one address, the only target of an `email` link (the contract's pattern).
 */
const MAILTO: RegExp = /^mailto:[^@\s/?#]+@[^@\s/?#]+\.[^@\s/?#]+$/;

/**
 * Constant HTTPS
 *
 * @description
 * `https://` address with a host, the only target of the other kinds (the contract's pattern).
 */
const HTTPS: RegExp = /^https:\/\/[^\s/?#]+\.[^\s/?#]+(?:[/?#]\S*)?$/;

/**
 * Interface ProfileLinkProps
 * @interface ProfileLinkProps
 *
 * @description
 * Raw link as received or stored.
 */
export interface ProfileLinkProps {
  // #region Properties
  /**
   * Property kind
   * @readonly
   *
   * @description
   * One of `PROFILE_LINK_KINDS`.
   */
  readonly kind: string;

  /**
   * Property url
   * @readonly
   *
   * @description
   * `mailto:` address of an `email` link, `https://` address otherwise.
   */
  readonly url: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Displayed name, or `null` for the kind's default (the address of an e-mail).
   */
  readonly label: string | null;
  // #endregion
}

/**
 * Class ProfileLink
 * @class ProfileLink
 *
 * @description
 * Public link of the profile, trimmed and checked: an `email` link targets `mailto:` and every other
 * kind `https://`, so the site never renders a `javascript:` or plain-HTTP address.
 */
export class ProfileLink {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores a value created by `of`.
   *
   * @param {ProfileLinkKind} kind - Link kind.
   * @param {string} url - Trimmed address.
   * @param {string | null} label - Trimmed label, `null` when blank.
   */
  private constructor(
    public readonly kind: ProfileLinkKind,
    public readonly url: string,
    public readonly label: string | null,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method of
   * @method of
   *
   * @description
   * Trims the address and the label (a blank label becomes `null`) and checks the kind, the scheme
   * and the lengths.
   *
   * @param {string} field - Contract path of the link (`links.0`).
   * @param {ProfileLinkProps} props - Raw link.
   * @throws {InvalidValueError} Under `<field>.kind`, `<field>.url` or `<field>.label`.
   * @returns {ProfileLink} Valid link.
   */
  public static of(field: string, props: ProfileLinkProps): ProfileLink {
    const kind: ProfileLinkKind | undefined = PROFILE_LINK_KINDS.find(
      (candidate: ProfileLinkKind): boolean => candidate === props.kind,
    );
    if (kind === undefined) {
      throw new InvalidValueError(`${field}.kind`, `unknown link kind "${props.kind}"`);
    }
    const url: string = props.url.trim();
    if (url.length === 0 || url.length > PROFILE_LINK_LIMITS.url) {
      throw new InvalidValueError(`${field}.url`, `1 to ${PROFILE_LINK_LIMITS.url} characters`);
    }
    if (!(kind === 'email' ? MAILTO : HTTPS).test(url)) {
      throw new InvalidValueError(
        `${field}.url`,
        kind === 'email' ? 'a mailto: address is expected' : 'an https:// address is expected',
      );
    }
    const label: string = props.label?.trim() ?? '';
    if (label.length > PROFILE_LINK_LIMITS.label) {
      throw new InvalidValueError(
        `${field}.label`,
        `at most ${PROFILE_LINK_LIMITS.label} characters`,
      );
    }
    return new ProfileLink(kind, url, label === '' ? null : label);
  }

  /**
   * Method toProps
   * @method toProps
   *
   * @description
   * Returns the serializable link for persistence and presenters.
   *
   * @returns {{ kind: ProfileLinkKind; url: string; label: string | null }} Link fields.
   */
  public toProps(): { kind: ProfileLinkKind; url: string; label: string | null } {
    return { kind: this.kind, url: this.url, label: this.label };
  }
  // #endregion
}
