/**
 * Type SiteLocale
 * @type SiteLocale
 *
 * @description
 * Locale identifier used to select the public site's French or English content.
 *
 * @type {'fr' | 'en'}
 */
export type SiteLocale = 'fr' | 'en';

/**
 * Interface Profile
 * @interface Profile
 *
 * @description
 * Localized profile copy displayed in the hero and about sections of the public site.
 */
export interface Profile {
  // #region Properties
  /**
   * Property heroIntro
   * @readonly
   *
   * @description
   * Introductory sentence rendered in the hero section.
   *
   * @type {string}
   */
  readonly heroIntro: string;

  /**
   * Property aboutStatement
   * @readonly
   *
   * @description
   * Main profile statement split into words for the about section's reading effect.
   *
   * @type {string}
   */
  readonly aboutStatement: string;

  /**
   * Property aboutLead
   * @readonly
   *
   * @description
   * Supporting profile copy displayed beneath the main statement.
   *
   * @type {string}
   */
  readonly aboutLead: string;

  /**
   * Property facts
   * @readonly
   *
   * @description
   * Label and value pairs shown as profile facts.
   *
   * @type {readonly { readonly label: string; readonly value: string }[]}
   */
  readonly facts: readonly { readonly label: string; readonly value: string }[];
  // #endregion
}

/**
 * Interface ProjectSummary
 * @interface ProjectSummary
 *
 * @description
 * Localized project fields required by both project cards and article pages.
 */
export interface ProjectSummary {
  // #region Properties
  /**
   * Property slug
   * @readonly
   *
   * @description
   * Stable URL segment used to identify the project page.
   *
   * @type {string}
   */
  readonly slug: string;

  /**
   * Property title
   * @readonly
   *
   * @description
   * Localized project title.
   *
   * @type {string}
   */
  readonly title: string;

  /**
   * Property summary
   * @readonly
   *
   * @description
   * Short localized copy used in the project card.
   *
   * @type {string}
   */
  readonly summary: string;

  /**
   * Property periodLabel
   * @readonly
   *
   * @description
   * Localized period text retained for the project card.
   *
   * @type {string}
   */
  readonly periodLabel: string;

  /**
   * Property techs
   * @readonly
   *
   * @description
   * Keys resolved against the technology catalogue for names and icons.
   *
   * @type {readonly string[]}
   */
  readonly techs: readonly string[];

  /**
   * Property featured
   * @readonly
   *
   * @description
   * Whether the project belongs in the featured project group.
   *
   * @type {boolean}
   */
  readonly featured: boolean;
  // #endregion
}

/**
 * Interface ProjectArticle
 * @interface ProjectArticle
 *
 * @description
 * Full localized case study, extending the fields shared with a project card.
 */
export interface ProjectArticle extends ProjectSummary {
  // #region Properties
  /**
   * Property lead
   * @readonly
   *
   * @description
   * Opening sentence displayed before the case study sections.
   *
   * @type {string}
   */
  readonly lead: string;

  /**
   * Property client
   * @readonly
   *
   * @description
   * Client or organization associated with the project.
   *
   * @type {string}
   */
  readonly client: string;

  /**
   * Property role
   * @readonly
   *
   * @description
   * Role performed on the project.
   *
   * @type {string}
   */
  readonly role: string;

  /**
   * Property place
   * @readonly
   *
   * @description
   * Location associated with the project.
   *
   * @type {string}
   */
  readonly place: string;

  /**
   * Property site
   * @readonly
   *
   * @description
   * Optional external project link and its localized label.
   *
   * @type {{ readonly url: string; readonly label: string } | null}
   */
  readonly site: { readonly url: string; readonly label: string } | null;

  /**
   * Property context
   * @readonly
   *
   * @description
   * Paragraphs describing the project context.
   *
   * @type {readonly string[]}
   */
  readonly context: readonly string[];

  /**
   * Property work
   * @readonly
   *
   * @description
   * Paragraphs describing the work delivered.
   *
   * @type {readonly string[]}
   */
  readonly work: readonly string[];

  /**
   * Property workList
   * @readonly
   *
   * @description
   * List entries describing individual contributions.
   *
   * @type {readonly string[]}
   */
  readonly workList: readonly string[];

  /**
   * Property choices
   * @readonly
   *
   * @description
   * Paragraphs explaining the project's technical or product choices.
   *
   * @type {readonly string[]}
   */
  readonly choices: readonly string[];

  /**
   * Property result
   * @readonly
   *
   * @description
   * Paragraphs describing project outcomes.
   *
   * @type {readonly string[]}
   */
  readonly result: readonly string[];

  /**
   * Property lessons
   * @readonly
   *
   * @description
   * Paragraphs recording lessons from the project.
   *
   * @type {readonly string[]}
   */
  readonly lessons: readonly string[];

  /**
   * Property captions
   * @readonly
   *
   * @description
   * Localized captions paired with case study images.
   *
   * @type {readonly string[]}
   */
  readonly captions: readonly string[];
  // #endregion
}

/**
 * Type TimelineKind
 * @type TimelineKind
 *
 * @description
 * Category distinguishing an education step from a work experience step.
 *
 * @type {'education' | 'experience'}
 */
export type TimelineKind = 'education' | 'experience';

/**
 * Interface TimelineStep
 * @interface TimelineStep
 *
 * @description
 * Localized timeline entry positioned by decimal-year values.
 */
export interface TimelineStep {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable key used to track the step in the timeline rendering.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property kind
   * @readonly
   *
   * @description
   * Whether the entry describes education or professional experience.
   *
   * @type {TimelineKind}
   */
  readonly kind: TimelineKind;

  /**
   * Property title
   * @readonly
   *
   * @description
   * Localized title of the timeline step.
   *
   * @type {string}
   */
  readonly title: string;

  /**
   * Property place
   * @readonly
   *
   * @description
   * School, employer, or other place associated with the step.
   *
   * @type {string}
   */
  readonly place: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Localized supporting text for the timeline step.
   *
   * @type {string}
   */
  readonly description: string;

  /**
   * Property dateLabel
   * @readonly
   *
   * @description
   * Localized human-readable period, such as a year range or an ongoing period.
   *
   * @type {string}
   */
  readonly dateLabel: string;

  /**
   * Property start
   * @readonly
   *
   * @description
   * Decimal year used to place the step on the timeline axis.
   *
   * @type {number}
   */
  readonly start: number;

  /**
   * Property end
   * @readonly
   *
   * @description
   * Exclusive decimal-year boundary after the final month; ongoing steps extend to the next calendar year.
   *
   * @type {number}
   */
  readonly end: number;

  /**
   * Property techs
   * @readonly
   *
   * @description
   * Technology keys associated with the timeline step.
   *
   * @type {readonly string[]}
   */
  readonly techs: readonly string[];
  // #endregion
}

/**
 * Interface SkillColumn
 * @interface SkillColumn
 *
 * @description
 * Localized group of technologies displayed as one skills column.
 */
export interface SkillColumn {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identifier used to track the skills column.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property domain
   * @readonly
   *
   * @description
   * Localized heading for the technology group.
   *
   * @type {string}
   */
  readonly domain: string;

  /**
   * Property techs
   * @readonly
   *
   * @description
   * Technology catalogue keys and optional language labels shown in this column.
   *
   * @type {readonly { readonly key: string; readonly language: string | null }[]}
   */
  readonly techs: readonly { readonly key: string; readonly language: string | null }[];

  /**
   * Property usage
   * @readonly
   *
   * @description
   * Localized explanation of how the grouped technologies are used.
   *
   * @type {string}
   */
  readonly usage: string;
  // #endregion
}

/**
 * Interface SiteContent
 * @interface SiteContent
 *
 * @description
 * Complete locale-specific content snapshot consumed by the public site.
 */
export interface SiteContent {
  // #region Properties
  /**
   * Property locale
   * @readonly
   *
   * @description
   * Locale represented by every localized field in this snapshot.
   *
   * @type {SiteLocale}
   */
  readonly locale: SiteLocale;

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Content revision used to identify the snapshot that was built.
   *
   * @type {number}
   */
  readonly revision: number;

  /**
   * Property profile
   * @readonly
   *
   * @description
   * Profile copy for the selected locale.
   *
   * @type {Profile}
   */
  readonly profile: Profile;

  /**
   * Property projects
   * @readonly
   *
   * @description
   * Full project articles available in the selected locale.
   *
   * @type {readonly ProjectArticle[]}
   */
  readonly projects: readonly ProjectArticle[];

  /**
   * Property timeline
   * @readonly
   *
   * @description
   * Education and experience steps for the selected locale.
   *
   * @type {readonly TimelineStep[]}
   */
  readonly timeline: readonly TimelineStep[];

  /**
   * Property skills
   * @readonly
   *
   * @description
   * Technology groups for the selected locale.
   *
   * @type {readonly SkillColumn[]}
   */
  readonly skills: readonly SkillColumn[];
  // #endregion
}
