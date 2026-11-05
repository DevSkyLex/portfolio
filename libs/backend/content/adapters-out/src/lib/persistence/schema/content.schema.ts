import type {
  ArticleDocumentProps,
  LegalDocumentKind,
  LocalizedTextProps,
  ProfileLinkKind,
  ProjectPeriodProps,
  ProjectSeoProps,
} from '@vfortin/content-domain';
import {
  type PgSchema,
  boolean,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { SeoSourceFailure } from '@vfortin/content-application';

/**
 * Constant contentSchema
 *
 * @description
 * PostgreSQL schema owned by the content bounded context and accessed only by its adapters.
 */
export const contentSchema: PgSchema<'content'> = pgSchema('content');

/**
 * Type Text
 * @type Text
 *
 * @description
 * Persisted localized text shape used by content JSON columns.
 */
type Text = LocalizedTextProps;

/**
 * Interface ArticleColumn
 * @interface ArticleColumn
 *
 * @description
 * JSON representation of a project article: one document per language, as the domain value stores it
 * (D40).
 */
export interface ArticleColumn {
  // #region Properties
  /**
   * Property fr
   * @readonly
   *
   * @description
   * French document.
   */
  readonly fr: ArticleDocumentProps;

  /**
   * Property en
   * @readonly
   *
   * @description
   * English document, absent until translated.
   */
  readonly en?: ArticleDocumentProps;
  // #endregion
}

/**
 * Interface CoverColumn
 * @interface CoverColumn
 *
 * @description
 * JSON representation of a project cover; the media reference is also read by the purge query.
 */
export interface CoverColumn {
  // #region Properties
  /**
   * Property media
   * @readonly
   *
   * @description
   * Identifier of the uploaded media.
   */
  readonly media: string;

  /**
   * Property alt
   * @readonly
   *
   * @description
   * Alternative text per language.
   */
  readonly alt: { readonly fr: string; readonly en?: string };
  // #endregion
}

/**
 * Type SeoTextsColumn
 * @type SeoTextsColumn
 *
 * @description
 * JSON representation of the search title and description of a project (D42); the keywords have their
 * own column, so the rows written before them need no rewrite.
 */
export type SeoTextsColumn = Pick<ProjectSeoProps, 'title' | 'description'>;

/**
 * Type SeoKeywordsColumn
 * @type SeoKeywordsColumn
 *
 * @description
 * JSON representation of the search keywords of a project per language, empty lists left out.
 */
export type SeoKeywordsColumn = ProjectSeoProps['keywords'];

/**
 * Constant EMPTY_SEO
 *
 * @description
 * Stored search texts of a project without any, the column default for existing rows.
 */
const EMPTY_SEO: SeoTextsColumn = { title: {}, description: {} };

/**
 * Constant EMPTY_SEO_KEYWORDS
 *
 * @description
 * Stored keywords of a project without any, the column default for existing rows: the public page then
 * falls back on the project's technologies.
 */
const EMPTY_SEO_KEYWORDS: SeoKeywordsColumn = {};

/**
 * Constant projects
 *
 * @description
 * Drizzle table storing project identity, editable content and publication state.
 */
export const projects = contentSchema.table('projects', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: jsonb('title').$type<Text>().notNull(),
  summary: jsonb('summary').$type<Text>().notNull(),
  lead: jsonb('lead').$type<Text>().notNull(),
  // Start and end, months or whole years (D46); the snapshot's label is written from it.
  period: jsonb('period').$type<ProjectPeriodProps>().notNull(),
  client: jsonb('client').$type<Text>().notNull(),
  role: jsonb('role').$type<Text>().notNull(),
  place: jsonb('place').$type<Text>().notNull(),
  siteUrl: text('site_url'),
  techs: jsonb('techs').$type<string[]>().notNull(),
  featured: boolean('featured').notNull().default(false),
  position: integer('position').notNull(),
  status: text('status', { enum: ['draft', 'published'] }).notNull(),
  version: integer('version').notNull().default(1),
  article: jsonb('article').$type<ArticleColumn>().notNull(),
  cover: jsonb('cover').$type<CoverColumn>(),
  seo: jsonb('seo').$type<SeoTextsColumn>().notNull().default(EMPTY_SEO),
  seoKeywords: jsonb('seo_keywords')
    .$type<SeoKeywordsColumn>()
    .notNull()
    .default(EMPTY_SEO_KEYWORDS),
});

/**
 * Constant media
 *
 * @description
 * Drizzle table of the uploaded images (D40). The id names the files `<id>.webp` and
 * `<id>-960.webp`; the unique SHA-256 of the uploaded bytes makes a repeated upload idempotent.
 */
export const media = contentSchema.table('media', {
  id: uuid('id').primaryKey(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  bytes: integer('bytes').notNull(),
  sha256: text('sha256').notNull().unique(),
  hasSmall: boolean('has_small').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  unlinkedAt: timestamp('unlinked_at', { withTimezone: true, mode: 'date' }),
});

/**
 * Constant timelineEntries
 *
 * @description
 * Drizzle table storing education and experience entries with month-precision dates, their order
 * within their kind (`position`, from 0) and the optimistic-lock version of their content.
 */
export const timelineEntries = contentSchema.table('timeline_entries', {
  id: text('id').primaryKey(),
  kind: text('kind', { enum: ['education', 'experience'] }).notNull(),
  title: jsonb('title').$type<Text>().notNull(),
  place: jsonb('place').$type<Text>().notNull(),
  description: jsonb('description').$type<Text>().notNull(),
  startYear: integer('start_year').notNull(),
  startMonth: integer('start_month').notNull(),
  endYear: integer('end_year'),
  endMonth: integer('end_month'),
  techs: jsonb('techs').$type<string[]>().notNull(),
  position: integer('position').notNull().default(0),
  version: integer('version').notNull().default(1),
});

/**
 * Constant timelineLists
 *
 * @description
 * One row per timeline kind holding the version of its list: creations, deletions and moves bump it,
 * and a reorder quotes it in `If-Match`. Updating the row also serializes those writes per kind.
 */
export const timelineLists = contentSchema.table('timeline_lists', {
  kind: text('kind', { enum: ['education', 'experience'] }).primaryKey(),
  version: integer('version').notNull().default(1),
});

/**
 * Constant skillGroups
 *
 * @description
 * Drizzle table storing ordered skill domains and their technology keys.
 */
export const skillGroups = contentSchema.table('skill_groups', {
  id: text('id').primaryKey(),
  domain: jsonb('domain').$type<Text>().notNull(),
  techs: jsonb('techs').$type<{ key: string; language: string | null }[]>().notNull(),
  usage: jsonb('usage').$type<Text>().notNull(),
  position: integer('position').notNull(),
});

/**
 * Type ProfileLinksColumn
 * @type ProfileLinksColumn
 *
 * @description
 * JSON representation of the public links of the profile, in display order.
 */
export type ProfileLinksColumn = { kind: ProfileLinkKind; url: string; label: string | null }[];

/**
 * Constant profile
 *
 * @description
 * Singleton profile row, identified by id `1`, containing home and About section copy, the public
 * links (written by migration 0009 for an existing row) and the optimistic-lock version of the
 * « Informations » editor.
 */
export const profile = contentSchema.table('profile', {
  id: integer('id').primaryKey(),
  heroIntro: jsonb('hero_intro').$type<Text>().notNull(),
  aboutStatement: jsonb('about_statement').$type<Text>().notNull(),
  aboutLead: jsonb('about_lead').$type<Text>().notNull(),
  facts: jsonb('facts').$type<{ label: Text; value: Text }[]>().notNull(),
  links: jsonb('links').$type<ProfileLinksColumn>().notNull().default([]),
  version: integer('version').notNull().default(1),
});

/**
 * Interface LegalBodyColumn
 * @interface LegalBodyColumn
 *
 * @description
 * JSON representation of a legal document: one article document per language, without figures.
 */
export interface LegalBodyColumn {
  // #region Properties
  /**
   * Property fr
   * @readonly
   *
   * @description
   * French document.
   */
  readonly fr: ArticleDocumentProps;

  /**
   * Property en
   * @readonly
   *
   * @description
   * English document.
   */
  readonly en: ArticleDocumentProps;
  // #endregion
}

/**
 * Constant legalDocuments
 *
 * @description
 * The legal notice and the privacy policy, one row per kind (written by migration 0009 and the seed),
 * with the time of their last save and their optimistic-lock version.
 */
export const legalDocuments = contentSchema.table('legal_documents', {
  kind: text('kind', { enum: ['notice', 'privacy'] })
    .$type<LegalDocumentKind>()
    .primaryKey(),
  body: jsonb('body').$type<LegalBodyColumn>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
  version: integer('version').notNull().default(1),
});

/**
 * Constant contentRevision
 *
 * @description
 * Singleton row with id `1` holding the revision of public content.
 */
export const contentRevision = contentSchema.table('content_revision', {
  id: integer('id').primaryKey(),
  revision: integer('revision').notNull(),
});

/**
 * Constant siteBuildRequests
 *
 * @description
 * Outbox table with one rebuild request per published revision; dispatching the newest revision
 * covers earlier requests.
 */
/** Persisted rows retained while editors prepare a grouped publication. */
export interface FrozenContentRows {
  readonly projects: (typeof projects.$inferSelect)[];
  readonly profile: (typeof profile.$inferSelect)[];
  readonly timeline: (typeof timelineEntries.$inferSelect)[];
  readonly skills: (typeof skillGroups.$inferSelect)[];
  readonly legal: (Omit<typeof legalDocuments.$inferSelect, 'updatedAt'> & { updatedAt: string })[];
  readonly media: (Omit<typeof media.$inferSelect, 'createdAt' | 'unlinkedAt'> & {
    createdAt: string;
    unlinkedAt: string | null;
  })[];
}

/** Explicit publication batch; its frozen rows survive service restarts. */
export const publicationState = contentSchema.table('publication_state', {
  id: integer('id').primaryKey(),
  version: integer('version').notNull().default(1),
  baseRevision: integer('base_revision').notNull().default(0),
  frozen: jsonb('frozen').$type<FrozenContentRows>(),
});

export const siteBuildRequests = contentSchema.table('site_build_requests', {
  revision: integer('revision').primaryKey(),
  status: text('status', { enum: ['pending', 'dispatched'] }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  requestedAt: timestamp('requested_at', { withTimezone: true, mode: 'date' }).notNull(),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true, mode: 'date' }).notNull(),
  claimedUntil: timestamp('claimed_until', { withTimezone: true, mode: 'date' }),
  dispatchedAt: timestamp('dispatched_at', { withTimezone: true, mode: 'date' }),
  lastError: text('last_error'),
});

/**
 * Constant seoReports
 *
 * @description
 * Cache of the Google reports of the SEO dashboard (D47), one row per source and range (`all` for the
 * Web Vitals): the last report fetched, kept when a later attempt fails, and the outcome of the last
 * attempt. The dashboard reads it; the daily job and the manual refresh write it.
 */
export const seoReports = contentSchema.table(
  'seo_reports',
  {
    source: text('source', { enum: ['search-console', 'analytics', 'web-vitals'] }).notNull(),
    range: text('range', { enum: ['7d', '28d', '90d', 'all'] }).notNull(),
    data: jsonb('data').$type<unknown>(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true, mode: 'date' }),
    failure: jsonb('failure').$type<SeoSourceFailure>(),
    attemptedAt: timestamp('attempted_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.source, table.range] })],
);

/**
 * Constant seoRefresh
 *
 * @description
 * Singleton row `id = 1` holding the start and end of the last dashboard refresh; claiming a refresh
 * updates its start conditionally, which serializes the manual refresh and the daily job.
 */
export const seoRefresh = contentSchema.table('seo_refresh', {
  id: integer('id').primaryKey(),
  startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }),
  finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'date' }),
});

/**
 * Constant contentTables
 *
 * @description
 * Table registry passed to shared database helpers to infer the content database handle type.
 */
export const contentTables = {
  projects,
  timelineEntries,
  timelineLists,
  skillGroups,
  profile,
  legalDocuments,
  contentRevision,
  publicationState,
  siteBuildRequests,
  media,
  seoReports,
  seoRefresh,
} as const;
