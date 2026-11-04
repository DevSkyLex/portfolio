import type { BilingualText } from '@internal/content-web-data-access/lib/admin/models/bilingual-text/bilingual-text.interface';
import type { ProfileLinkKind } from '@internal/content-web-data-access/lib/admin/models/profile-link-kind/profile-link-kind.type';

/**
 * Interface AdminProfile
 * @interface AdminProfile
 *
 * @description
 * Profile (« Informations ») as the administration edits it: texts per locale (an English text not
 * written yet is empty), facts, public links and the version quoted in `If-Match`.
 */
export interface AdminProfile {
  // #region Properties
  /**
   * Property heroIntro
   * @readonly
   *
   * @description
   * Home introduction.
   *
   * @type {Readonly<BilingualText>}
   */
  readonly heroIntro: Readonly<BilingualText>;

  /**
   * Property aboutStatement
   * @readonly
   *
   * @description
   * « À propos » statement.
   *
   * @type {Readonly<BilingualText>}
   */
  readonly aboutStatement: Readonly<BilingualText>;

  /**
   * Property aboutLead
   * @readonly
   *
   * @description
   * « À propos » lead.
   *
   * @type {Readonly<BilingualText>}
   */
  readonly aboutLead: Readonly<BilingualText>;

  /**
   * Property facts
   * @readonly
   *
   * @description
   * Facts in display order.
   *
   * @type {readonly { readonly label: Readonly<BilingualText>; readonly value: Readonly<BilingualText> }[]}
   */
  readonly facts: readonly {
    readonly label: Readonly<BilingualText>;
    readonly value: Readonly<BilingualText>;
  }[];

  /**
   * Property links
   * @readonly
   *
   * @description
   * Public links in display order; `label` is `null` for the kind's default name.
   *
   * @type {readonly { readonly kind: ProfileLinkKind; readonly url: string; readonly label: string | null }[]}
   */
  readonly links: readonly {
    readonly kind: ProfileLinkKind;
    readonly url: string;
    readonly label: string | null;
  }[];

  /**
   * Property version
   * @readonly
   *
   * @description
   * Version read, quoted in `If-Match`.
   *
   * @type {number}
   */
  readonly version: number;
  // #endregion
}
