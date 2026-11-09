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

  /**
   * Property links
   * @readonly
   *
   * @description
   * Public links in display order (contact section, footer).
   *
   * @type {readonly SiteLink[]}
   */
  readonly links: readonly SiteLink[];
  // #endregion
}

/**
 * Type SiteLinkKind
 * @type SiteLinkKind
 *
 * @description
 * Kind of a public link, which chooses its icon.
 */
export type SiteLinkKind = 'email' | 'github' | 'linkedin' | 'malt' | 'website';

/**
 * Interface SiteLink
 * @interface SiteLink
 *
 * @description
 * Public link of the profile, its label resolved: the written one, else the address of an e-mail, the
 * brand of a profile or the host of a website.
 */
export interface SiteLink {
  // #region Properties
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Link kind.
   *
   * @type {SiteLinkKind}
   */
  readonly kind: SiteLinkKind;

  /**
   * Property href
   * @readonly
   *
   * @description
   * `mailto:` address of an e-mail, `https://` address otherwise.
   *
   * @type {string}
   */
  readonly href: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Displayed text.
   *
   * @type {string}
   */
  readonly label: string;
  // #endregion
}

/**
 * Type LegalDocumentKind
 * @type LegalDocumentKind
 *
 * @description
 * Legal notice or privacy policy.
 */
export type LegalDocumentKind = 'notice' | 'privacy';

/**
 * Type LegalBlock
 * @type LegalBlock
 *
 * @description
 * Block of a legal document (D40). Mermaid source is represented as code on legal pages.
 */
export type LegalBlock = Exclude<ArticleBlock, { readonly kind: 'figure' | 'diagram' }>;

/**
 * Interface LegalSection
 * @interface LegalSection
 *
 * @description
 * Part of a legal document opened by a level-2 heading.
 */
export interface LegalSection {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Slug of the heading, unique within the document.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Plain text of the heading.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property blocks
   * @readonly
   *
   * @description
   * Blocks until the next level-2 heading.
   *
   * @type {readonly LegalBlock[]}
   */
  readonly blocks: readonly LegalBlock[];
  // #endregion
}

/**
 * Interface LegalDocument
 * @interface LegalDocument
 *
 * @description
 * Legal notice or privacy policy in the site locale.
 */
export interface LegalDocument {
  // #region Properties
  /**
   * Property updatedOn
   * @readonly
   *
   * @description
   * Date of the last save, `YYYY-MM-DD`, shown as « Dernière mise à jour ».
   *
   * @type {string}
   */
  readonly updatedOn: string;

  /**
   * Property intro
   * @readonly
   *
   * @description
   * Blocks before the first level-2 heading.
   *
   * @type {readonly LegalBlock[]}
   */
  readonly intro: readonly LegalBlock[];

  /**
   * Property sections
   * @readonly
   *
   * @description
   * Sections in document order.
   *
   * @type {readonly LegalSection[]}
   */
  readonly sections: readonly LegalSection[];
  // #endregion
}

/**
 * Interface ProjectImage
 * @interface ProjectImage
 *
 * @description
 * Uploaded image of a project (D40): a WebP of 2400 px wide at most, its 960 px rendition and the
 * intrinsic size that reserves its box before it loads.
 */
export interface ProjectImage {
  // #region Properties
  /**
   * Property src
   * @readonly
   *
   * @description
   * Full rendition, `/media/<uuid>.webp`.
   *
   * @type {string}
   */
  readonly src: string;

  /**
   * Property small
   * @readonly
   *
   * @description
   * 960 px rendition, `/media/<uuid>-960.webp`, or `null` when the original is not wider.
   *
   * @type {string | null}
   */
  readonly small: string | null;

  /**
   * Property width
   * @readonly
   *
   * @description
   * Intrinsic width of the full rendition, in pixels.
   *
   * @type {number}
   */
  readonly width: number;

  /**
   * Property height
   * @readonly
   *
   * @description
   * Intrinsic height of the full rendition, in pixels.
   *
   * @type {number}
   */
  readonly height: number;

  /**
   * Property alt
   * @readonly
   *
   * @description
   * Localized alternative text.
   *
   * @type {string}
   */
  readonly alt: string;
  // #endregion
}

/**
 * Type ArticleInline
 * @type ArticleInline
 *
 * @description
 * Inline content of a paragraph or a subheading, as a tree: consecutive text sharing a mark is grouped
 * under one `bold`, `italic`, `code` or `link` node, so nested marks render as nested elements. An
 * `external` link opens an `https://` address; the others are `mailto:` links.
 */
export type ArticleInline =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'break' }
  | { readonly kind: 'bold' | 'italic' | 'code'; readonly content: readonly ArticleInline[] }
  | {
      readonly kind: 'link';
      readonly href: string;
      readonly external: boolean;
      readonly content: readonly ArticleInline[];
    };

/**
 * Interface ArticleParagraph
 * @interface ArticleParagraph
 *
 * @description
 * Paragraph of an article, at the top level, in a list item or in a quotation.
 */
export interface ArticleParagraph {
  // #region Properties
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Block discriminant.
   *
   * @type {'paragraph'}
   */
  readonly kind: 'paragraph';

  /**
   * Property content
   * @readonly
   *
   * @description
   * Inline content; empty for an empty paragraph.
   *
   * @type {readonly ArticleInline[]}
   */
  readonly content: readonly ArticleInline[];
  // #endregion
}

/**
 * Interface ArticleList
 * @interface ArticleList
 *
 * @description
 * Bullet or ordered list; each item holds paragraphs and nested lists (three levels at most).
 */
export interface ArticleList {
  // #region Properties
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Block discriminant.
   *
   * @type {'list'}
   */
  readonly kind: 'list';

  /**
   * Property ordered
   * @readonly
   *
   * @description
   * Whether the items are numbered.
   *
   * @type {boolean}
   */
  readonly ordered: boolean;

  /**
   * Property start
   * @readonly
   *
   * @description
   * Number of the first item of an ordered list; 1 for a bullet list.
   *
   * @type {number}
   */
  readonly start: number;

  /**
   * Property items
   * @readonly
   *
   * @description
   * Items, each one the blocks it contains.
   *
   * @type {readonly (readonly ArticleFlowBlock[])[]}
   */
  readonly items: readonly (readonly ArticleFlowBlock[])[];
  // #endregion
}

/**
 * Type ArticleCodeTokenKind
 * @type ArticleCodeTokenKind
 *
 * @description
 * Kind of a highlighted run of code, each drawn in its own colour.
 */
export type ArticleCodeTokenKind =
  | 'keyword'
  | 'string'
  | 'number'
  | 'literal'
  | 'comment'
  | 'function'
  | 'type'
  | 'variable'
  | 'property'
  | 'operator'
  | 'punctuation'
  | 'tag'
  | 'attribute'
  | 'meta';

/**
 * Interface ArticleCodeToken
 * @interface ArticleCodeToken
 *
 * @description
 * Highlighted run of a code block; a run without kind is drawn as plain code.
 */
export interface ArticleCodeToken {
  // #region Properties
  /**
   * Property text
   * @readonly
   *
   * @description
   * Text of the run, line breaks and indentation included.
   *
   * @type {string}
   */
  readonly text: string;

  /**
   * Property kind
   * @readonly
   *
   * @description
   * Kind of the run, `null` for plain code.
   *
   * @type {ArticleCodeTokenKind | null}
   */
  readonly kind: ArticleCodeTokenKind | null;
  // #endregion
}

/**
 * Interface ArticleCode
 * @interface ArticleCode
 *
 * @description
 * Code block of an article, highlighted when the snapshot was built (D40 code block revision).
 */
export interface ArticleCode {
  // #region Properties
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Block discriminant.
   *
   * @type {'code'}
   */
  readonly kind: 'code';

  /**
   * Property text
   * @readonly
   *
   * @description
   * Code as written, the text the copy button writes to the clipboard.
   *
   * @type {string}
   */
  readonly text: string;

  /**
   * Property language
   * @readonly
   *
   * @description
   * Display name of the language (`TypeScript`), `null` for plain text.
   *
   * @type {string | null}
   */
  readonly language: string | null;

  /**
   * Property tokens
   * @readonly
   *
   * @description
   * Highlighted runs spelling `text`; empty when the block is plain text, which is then shown as is.
   *
   * @type {readonly ArticleCodeToken[]}
   */
  readonly tokens: readonly ArticleCodeToken[];
  // #endregion
}

/**
 * Type ArticleFlowBlock
 * @type ArticleFlowBlock
 *
 * @description
 * Block allowed inside a list item or a quotation.
 */
export type ArticleFlowBlock = ArticleParagraph | ArticleList;

/**
 * Type ArticleBlock
 * @type ArticleBlock
 *
 * @description
 * Top-level block of an article (D40). Level-3 headings are `subheading` blocks; level-2 headings open
 * an `ArticleSection` instead of appearing as blocks.
 */
export type ArticleBlock =
  | ArticleParagraph
  | ArticleList
  | { readonly kind: 'subheading'; readonly content: readonly ArticleInline[] }
  | { readonly kind: 'blockquote'; readonly blocks: readonly ArticleFlowBlock[] }
  | ArticleCode
  | { readonly kind: 'diagram'; readonly source: string }
  | { readonly kind: 'rule' }
  | { readonly kind: 'figure'; readonly image: ProjectImage; readonly caption: string };

/**
 * Interface ArticleSection
 * @interface ArticleSection
 *
 * @description
 * Part of an article opened by a level-2 heading; it is one entry of the table of contents.
 */
export interface ArticleSection {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Fragment identifier: the slug of the label, made unique within the article.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Plain text of the heading, shown as the section title and the table-of-contents link.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property blocks
   * @readonly
   *
   * @description
   * Blocks between this heading and the next level-2 heading.
   *
   * @type {readonly ArticleBlock[]}
   */
  readonly blocks: readonly ArticleBlock[];
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

  /**
   * Property cover
   * @readonly
   *
   * @description
   * Uploaded cover image, or `null` when the card and the article keep their tinted placeholder.
   *
   * @type {ProjectImage | null}
   */
  readonly cover: ProjectImage | null;
  // #endregion
}

/**
 * Interface ProjectSeo
 * @interface ProjectSeo
 *
 * @description
 * Search texts and keywords written by the administrator for the active locale; `null` or an empty
 * list lets the project page fall back on the project title, summary and technologies (D42).
 */
export interface ProjectSeo {
  // #region Properties
  /**
   * Property title
   * @readonly
   *
   * @description
   * Custom document and social title, used verbatim (70 characters at most).
   *
   * @type {string | null}
   */
  readonly title: string | null;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Custom meta and social description, used verbatim (170 characters at most).
   *
   * @type {string | null}
   */
  readonly description: string | null;

  /**
   * Property keywords
   * @readonly
   *
   * @description
   * Custom keywords of the meta keywords and the JSON-LD (10 at most), empty to fall back on the
   * project technologies.
   *
   * @type {readonly string[]}
   */
  readonly keywords: readonly string[];
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
   * Property intro
   * @readonly
   *
   * @description
   * Blocks written before the first level-2 heading, rendered above the sections.
   *
   * @type {readonly ArticleBlock[]}
   */
  readonly intro: readonly ArticleBlock[];

  /**
   * Property sections
   * @readonly
   *
   * @description
   * Article parts opened by a level-2 heading, in document order; they form the table of contents.
   *
   * @type {readonly ArticleSection[]}
   */
  readonly sections: readonly ArticleSection[];

  /**
   * Property seo
   * @readonly
   *
   * @description
   * Optional search texts of the case study page.
   *
   * @type {ProjectSeo}
   */
  readonly seo: ProjectSeo;
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

  /**
   * Property legal
   * @readonly
   *
   * @description
   * Legal notice and privacy policy for the selected locale.
   *
   * @type {Readonly<Record<LegalDocumentKind, LegalDocument>>}
   */
  readonly legal: Readonly<Record<LegalDocumentKind, LegalDocument>>;
  // #endregion
}
