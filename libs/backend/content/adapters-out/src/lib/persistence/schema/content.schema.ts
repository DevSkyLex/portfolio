import type { LocalizedTextProps } from '@vfortin/content-domain';
import {
  type PgSchema,
  boolean,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

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
 * JSON representation of the localized paragraph groups stored for a project article.
 */
export interface ArticleColumn {
  // #region Properties
  /**
   * Property context
   * @readonly
   *
   * @description
   * Paragraphs describing the project's context.
   */
  readonly context: Text[];

  /**
   * Property work
   * @readonly
   *
   * @description
   * Narrative paragraphs describing completed work.
   */
  readonly work: Text[];

  /**
   * Property workList
   * @readonly
   *
   * @description
   * Work descriptions stored for list presentation.
   */
  readonly workList: Text[];

  /**
   * Property choices
   * @readonly
   *
   * @description
   * Paragraphs describing implementation choices.
   */
  readonly choices: Text[];

  /**
   * Property result
   * @readonly
   *
   * @description
   * Paragraphs describing project outcomes.
   */
  readonly result: Text[];

  /**
   * Property lessons
   * @readonly
   *
   * @description
   * Reflections recorded for the case study.
   */
  readonly lessons: Text[];

  /**
   * Property captions
   * @readonly
   *
   * @description
   * Captions associated with case-study media.
   */
  readonly captions: Text[];
  // #endregion
}

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
  periodLabel: jsonb('period_label').$type<Text>().notNull(),
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
});

/**
 * Constant timelineEntries
 *
 * @description
 * Drizzle table storing education and experience entries with month-precision dates.
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
 * Constant profile
 *
 * @description
 * Singleton profile row, identified by id `1`, containing home and About section copy.
 */
export const profile = contentSchema.table('profile', {
  id: integer('id').primaryKey(),
  heroIntro: jsonb('hero_intro').$type<Text>().notNull(),
  aboutStatement: jsonb('about_statement').$type<Text>().notNull(),
  aboutLead: jsonb('about_lead').$type<Text>().notNull(),
  facts: jsonb('facts').$type<{ label: Text; value: Text }[]>().notNull(),
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
 * Constant contentTables
 *
 * @description
 * Table registry passed to shared database helpers to infer the content database handle type.
 */
export const contentTables = {
  projects,
  timelineEntries,
  skillGroups,
  profile,
  contentRevision,
  siteBuildRequests,
} as const;
