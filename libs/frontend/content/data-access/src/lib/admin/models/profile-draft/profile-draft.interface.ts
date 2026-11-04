import type { BilingualText } from '@internal/content-web-data-access/lib/admin/models/bilingual-text/bilingual-text.interface';
import type { ProfileLinkKind } from '@internal/content-web-data-access/lib/admin/models/profile-link-kind/profile-link-kind.type';

/**
 * Interface ProfileDraft
 * @interface ProfileDraft
 *
 * @description
 * Editable values of the profile form: every text per locale, facts and links, a blank link label
 * meaning the kind's default name.
 */
export interface ProfileDraft {
  // #region Properties
  /**
   * Property heroIntro
   *
   * @description
   * Home introduction.
   *
   * @type {BilingualText}
   */
  heroIntro: BilingualText;

  /**
   * Property aboutStatement
   *
   * @description
   * « À propos » statement.
   *
   * @type {BilingualText}
   */
  aboutStatement: BilingualText;

  /**
   * Property aboutLead
   *
   * @description
   * « À propos » lead.
   *
   * @type {BilingualText}
   */
  aboutLead: BilingualText;

  /**
   * Property facts
   *
   * @description
   * Facts in display order.
   *
   * @type {{ label: BilingualText; value: BilingualText }[]}
   */
  facts: { label: BilingualText; value: BilingualText }[];

  /**
   * Property links
   *
   * @description
   * Public links in display order.
   *
   * @type {{ kind: ProfileLinkKind; url: string; label: string }[]}
   */
  links: { kind: ProfileLinkKind; url: string; label: string }[];
  // #endregion
}
