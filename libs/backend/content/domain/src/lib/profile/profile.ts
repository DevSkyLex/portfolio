import { InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';
import type { LocalizedText } from '@internal/content-domain/lib/values/localized-text/localized-text';
import type { Period } from '@internal/content-domain/lib/values/period/period';

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
  // #endregion
}

/**
 * Type TimelineKind
 * @type TimelineKind
 *
 * @description
 * Classification used to distinguish education from professional experience.
 */
export type TimelineKind = 'education' | 'experience';

/**
 * Interface TimelineEntry
 * @interface TimelineEntry
 *
 * @description
 * One education or experience entry with localized content and a month-precision period.
 */
export interface TimelineEntry {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identifier of this timeline entry.
   */
  readonly id: string;

  /**
   * Property kind
   * @readonly
   *
   * @description
   * Distinguishes education entries from experience entries.
   */
  readonly kind: TimelineKind;

  /**
   * Property title
   * @readonly
   *
   * @description
   * Localized role, degree or programme title.
   */
  readonly title: LocalizedText;

  /**
   * Property place
   * @readonly
   *
   * @description
   * Localized employer, school or location name.
   */
  readonly place: LocalizedText;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Localized summary of the experience or education entry.
   */
  readonly description: LocalizedText;

  /**
   * Property period
   * @readonly
   *
   * @description
   * Start and optional end month used for chronological ordering.
   */
  readonly period: Period;

  /**
   * Property techs
   * @readonly
   *
   * @description
   * Technology keys associated with this entry.
   */
  readonly techs: readonly string[];
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
