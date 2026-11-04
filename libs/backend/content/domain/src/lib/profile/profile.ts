import { DomainError, InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';
import {
  LOCALES,
  type Locale,
  LocalizedText,
} from '@internal/content-domain/lib/values/localized-text/localized-text';
import {
  ProfileLink,
  type ProfileLinkProps,
} from '@internal/content-domain/lib/values/profile-link/profile-link';

/**
 * Constant PROFILE_LIMITS
 *
 * @description
 * Longest trimmed text per locale and largest lists of the profile; mirrored by `PROFILE_LIMITS` in
 * the content contracts and by the admin form's browser copy (D10).
 */
export const PROFILE_LIMITS: {
  readonly heroIntro: 240;
  readonly aboutStatement: 280;
  readonly aboutLead: 600;
  readonly facts: 8;
  readonly factLabel: 40;
  readonly factValue: 120;
  readonly links: 8;
} = {
  heroIntro: 240,
  aboutStatement: 280,
  aboutLead: 600,
  facts: 8,
  factLabel: 40,
  factValue: 120,
  links: 8,
} as const;

/**
 * Type DraftText
 * @type DraftText
 *
 * @description
 * Unvalidated text per locale.
 */
type DraftText = { readonly fr: string; readonly en?: string | undefined };

/**
 * Interface ProfileDraft
 * @interface ProfileDraft
 *
 * @description
 * Unvalidated profile revision as received from an administrator, under the contract's field names
 * (`heroIntro.fr`, `facts.0.label.en`, `links.1.url`), which the validation reports.
 */
export interface ProfileDraft {
  // #region Properties
  /**
   * Property heroIntro
   * @readonly
   *
   * @description
   * Home introduction per locale.
   */
  readonly heroIntro: DraftText;

  /**
   * Property aboutStatement
   * @readonly
   *
   * @description
   * « À propos » statement per locale.
   */
  readonly aboutStatement: DraftText;

  /**
   * Property aboutLead
   * @readonly
   *
   * @description
   * « À propos » lead per locale.
   */
  readonly aboutLead: DraftText;

  /**
   * Property facts
   * @readonly
   *
   * @description
   * Facts in display order.
   */
  readonly facts: readonly { readonly label: DraftText; readonly value: DraftText }[];

  /**
   * Property links
   * @readonly
   *
   * @description
   * Public links in display order.
   */
  readonly links: readonly ProfileLinkProps[];
  // #endregion
}

/**
 * Function profileText
 *
 * @description
 * Normalizes one localized text and checks its length per locale.
 *
 * @param {string} field - Contract path of the text (`heroIntro`, `facts.0.label`).
 * @param {DraftText} value - Raw translations.
 * @param {number} max - Longest trimmed text.
 * @throws {InvalidValueError} Under `<field>.<locale>` for a blank French text or a text too long.
 * @returns {LocalizedText} Normalized value.
 */
function profileText(field: string, value: DraftText, max: number): LocalizedText {
  const text: LocalizedText = LocalizedText.of(
    `${field}.fr`,
    value.en === undefined ? { fr: value.fr } : { fr: value.fr, en: value.en },
  );
  for (const locale of LOCALES) {
    if ((text[locale] ?? '').length > max) {
      throw new InvalidValueError(`${field}.${locale}`, `at most ${max} characters`);
    }
  }
  return text;
}

/**
 * Function reviseProfile
 *
 * @description
 * Validates an administrator revision: every text within `PROFILE_LIMITS` (French required), at most
 * 8 facts and 8 links, each link valid (`ProfileLink.of`), no kind but `website` twice and no address
 * twice. The profile is public as soon as it is saved, so every text also needs its English version.
 *
 * @param {ProfileDraft} draft - Unvalidated revision.
 * @param {number} version - Version of the stored profile the revision replaces.
 * @throws {InvalidValueError} With the contract path of the first invalid field.
 * @throws {DomainError} `content.profile-incomplete` listing the texts missing in English.
 * @returns {Profile} Revised profile, still at `version` (the repository increments it).
 */
export function reviseProfile(draft: ProfileDraft, version: number): Profile {
  if (draft.facts.length > PROFILE_LIMITS.facts) {
    throw new InvalidValueError('facts', `at most ${PROFILE_LIMITS.facts} facts`);
  }
  if (draft.links.length > PROFILE_LIMITS.links) {
    throw new InvalidValueError('links', `at most ${PROFILE_LIMITS.links} links`);
  }
  const profile: Profile = {
    heroIntro: profileText('heroIntro', draft.heroIntro, PROFILE_LIMITS.heroIntro),
    aboutStatement: profileText(
      'aboutStatement',
      draft.aboutStatement,
      PROFILE_LIMITS.aboutStatement,
    ),
    aboutLead: profileText('aboutLead', draft.aboutLead, PROFILE_LIMITS.aboutLead),
    facts: draft.facts.map((fact: ProfileDraft['facts'][number], index: number): ProfileFact => ({
      label: profileText(`facts.${index}.label`, fact.label, PROFILE_LIMITS.factLabel),
      value: profileText(`facts.${index}.value`, fact.value, PROFILE_LIMITS.factValue),
    })),
    links: profileLinks(draft.links),
    version,
  };
  const missing: string[] = missingInProfile(profile, LOCALES);
  if (missing.length > 0) {
    throw new DomainError(
      'content.profile-incomplete',
      'The profile is public at once: write its texts in French and English.',
      missing,
    );
  }
  return profile;
}

/**
 * Function profileLinks
 *
 * @description
 * Validates the links of a profile, a stored one included.
 *
 * @param {readonly ProfileLinkProps[]} links - Raw links in display order.
 * @throws {InvalidValueError} Under `links.<index>.<field>` for an invalid link, a kind but `website`
 * listed twice or an address listed twice.
 * @returns {ProfileLink[]} Valid links.
 */
export function profileLinks(links: readonly ProfileLinkProps[]): ProfileLink[] {
  const kinds: Set<string> = new Set<string>();
  const urls: Set<string> = new Set<string>();
  return links.map((props: ProfileLinkProps, index: number): ProfileLink => {
    const link: ProfileLink = ProfileLink.of(`links.${index}`, props);
    if (link.kind !== 'website' && kinds.has(link.kind)) {
      throw new InvalidValueError(`links.${index}.kind`, `only one ${link.kind} link`);
    }
    if (urls.has(link.url)) {
      throw new InvalidValueError(`links.${index}.url`, 'this address is already listed');
    }
    kinds.add(link.kind);
    urls.add(link.url);
    return link;
  });
}

/**
 * Function missingInProfile
 *
 * @description
 * Lists the text paths (`heroIntro.en`, `facts.1.value.en`…) without content in the supplied locales.
 *
 * @param {Profile} profile - Profile to check.
 * @param {readonly Locale[]} locales - Locales to check.
 * @returns {string[]} Missing field paths.
 */
function missingInProfile(profile: Profile, locales: readonly Locale[]): string[] {
  const texts: [string, LocalizedText][] = [
    ['heroIntro', profile.heroIntro],
    ['aboutStatement', profile.aboutStatement],
    ['aboutLead', profile.aboutLead],
    ...profile.facts.flatMap((fact: ProfileFact, index: number): [string, LocalizedText][] => [
      [`facts.${index}.label`, fact.label],
      [`facts.${index}.value`, fact.value],
    ]),
  ];
  return locales.flatMap((locale: Locale): string[] =>
    texts
      .filter(([, text]: [string, LocalizedText]): boolean => !text.isCompleteFor(locale))
      .map(([path]: [string, LocalizedText]): string => `${path}.${locale}`),
  );
}

/**
 * Interface ProfileFact
 * @interface ProfileFact
 *
 * @description
 * Labeled fact displayed in the profile section.
 */
export interface ProfileFact {
  // #region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Localized name of the fact.
   */
  readonly label: LocalizedText;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Localized value displayed beside the label.
   */
  readonly value: LocalizedText;
  // #endregion
}

/**
 * Interface Profile
 * @interface Profile
 *
 * @description
 * Localized introduction copy and facts consumed by the home and About sections.
 */
export interface Profile {
  // #region Properties
  /**
   * Property heroIntro
   * @readonly
   *
   * @description
   * Introductory text rendered in the home page hero.
   */
  readonly heroIntro: LocalizedText;

  /**
   * Property aboutStatement
   * @readonly
   *
   * @description
   * Main statement displayed in the About section.
   */
  readonly aboutStatement: LocalizedText;

  /**
   * Property aboutLead
   * @readonly
   *
   * @description
   * Supporting lead displayed with the About statement.
   */
  readonly aboutLead: LocalizedText;

  /**
   * Property facts
   * @readonly
   *
   * @description
   * Facts displayed in their supplied order in the profile section.
   */
  readonly facts: readonly ProfileFact[];

  /**
   * Property links
   * @readonly
   *
   * @description
   * Public links (e-mail, profiles) in display order, shown by the contact section and the footer.
   */
  readonly links: readonly ProfileLink[];

  /**
   * Property version
   * @readonly
   *
   * @description
   * Optimistic-lock version of the profile, starting at 1.
   */
  readonly version: number;
  // #endregion
}

/**
 * Interface SkillTech
 * @interface SkillTech
 *
 * @description
 * Technology key and optional language shown with it in the skills section.
 */
export interface SkillTech {
  // #region Properties
  /**
   * Property key
   * @readonly
   *
   * @description
   * Stable technology catalogue key.
   */
  readonly key: string;

  /**
   * Property language
   * @readonly
   *
   * @description
   * Optional associated programming language shown alongside the technology.
   */
  readonly language: string | null;
  // #endregion
}

/**
 * Interface SkillGroup
 * @interface SkillGroup
 *
 * @description
 * Ordered column of localized skill-domain content and its technologies.
 */
export interface SkillGroup {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identifier of the skill group.
   */
  readonly id: string;

  /**
   * Property domain
   * @readonly
   *
   * @description
   * Localized name of the skill domain.
   */
  readonly domain: LocalizedText;

  /**
   * Property techs
   * @readonly
   *
   * @description
   * Technologies shown in this group; the assertion requires at least one.
   */
  readonly techs: readonly SkillTech[];

  /**
   * Property usage
   * @readonly
   *
   * @description
   * Localized description of how the technologies in this group are used.
   */
  readonly usage: LocalizedText;

  /**
   * Property position
   * @readonly
   *
   * @description
   * Display-order value used when skill groups are sorted.
   */
  readonly position: number;
  // #endregion
}

/**
 * Function assertSkillGroup
 *
 * @description
 * Enforces the presentation invariant that every skill group contains a technology.
 *
 * @param {SkillGroup} group - Skill group to validate.
 * @returns {SkillGroup} The same group when its technology list is nonempty.
 * @throws {InvalidValueError} When the group has no technologies.
 */
export function assertSkillGroup(group: SkillGroup): SkillGroup {
  if (group.techs.length === 0) {
    throw new InvalidValueError('skills', `the "${group.domain.fr}" domain has no tech`);
  }
  return group;
}
