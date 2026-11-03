import {
  LocalizedText,
  type LocalizedTextProps,
  Period,
  type Profile,
  Project,
  type SkillGroup,
  Slug,
  type TimelineEntry,
  type YearMonth,
  assertSkillGroup,
} from '@vfortin/content-domain';
import type {
  profile,
  projects,
  skillGroups,
  timelineEntries,
} from '@internal/content-adapters-out/lib/persistence/schema/content.schema';

/**
 * Type ProjectRow
 * @type ProjectRow
 *
 * @description
 * Drizzle select shape for the persisted projects table.
 */
type ProjectRow = typeof projects.$inferSelect;

/**
 * Type TimelineRow
 * @type TimelineRow
 *
 * @description
 * Drizzle select shape for a persisted timeline entry.
 */
type TimelineRow = typeof timelineEntries.$inferSelect;

/**
 * Type SkillRow
 * @type SkillRow
 *
 * @description
 * Drizzle select shape for a persisted skill group.
 */
type SkillRow = typeof skillGroups.$inferSelect;

/**
 * Type ProfileRow
 * @type ProfileRow
 *
 * @description
 * Drizzle select shape for the singleton profile row.
 */
type ProfileRow = typeof profile.$inferSelect;

/**
 * Constant text
 *
 * @description
 * Domain factory used to normalize and validate persisted localized text.
 */
const text: typeof LocalizedText.of = LocalizedText.of;

/**
 * Function toProject
 *
 * @description
 * Rehydrates a project row into domain values, validating the slug, localized fields and article
 * paragraphs before exposing it to application code.
 *
 * @param {ProjectRow} row - Database row selected from the projects table.
 * @returns {Project} Validated project aggregate.
 */
export function toProject(row: ProjectRow): Project {
  const paragraphs: (field: string, values: ProjectRow['article']['context']) => LocalizedText[] = (
    field: string,
    values: ProjectRow['article']['context'],
  ): LocalizedText[] =>
    values.map((value: LocalizedTextProps): LocalizedText => text(field, value));
  return Project.rehydrate({
    id: row.id,
    slug: Slug.of(row.slug),
    title: text('title', row.title),
    summary: text('summary', row.summary),
    lead: text('lead', row.lead),
    periodLabel: text('periodLabel', row.periodLabel),
    client: text('client', row.client),
    role: text('role', row.role),
    place: text('place', row.place),
    siteUrl: row.siteUrl,
    techs: row.techs,
    featured: row.featured,
    position: row.position,
    status: row.status,
    version: row.version,
    article: {
      context: paragraphs('article.context', row.article.context),
      work: paragraphs('article.work', row.article.work),
      workList: paragraphs('article.workList', row.article.workList),
      choices: paragraphs('article.choices', row.article.choices),
      result: paragraphs('article.result', row.article.result),
      lessons: paragraphs('article.lessons', row.article.lessons),
      captions: paragraphs('article.captions', row.article.captions),
    },
  });
}

/**
 * Function toTimelineEntry
 *
 * @description
 * Converts stored date columns and localized text into a validated timeline entry.
 *
 * @param {TimelineRow} row - Database row selected from timeline entries.
 * @returns {TimelineEntry} Domain timeline entry.
 */
export function toTimelineEntry(row: TimelineRow): TimelineEntry {
  const end: YearMonth | null =
    row.endYear === null || row.endMonth === null
      ? null
      : { year: row.endYear, month: row.endMonth };
  return {
    id: row.id,
    kind: row.kind,
    title: text('title', row.title),
    place: text('place', row.place),
    description: text('description', row.description),
    period: Period.of({ year: row.startYear, month: row.startMonth }, end),
    techs: row.techs,
  };
}

/**
 * Function toSkillGroup
 *
 * @description
 * Converts a persisted skill row and applies the domain requirement for a nonempty technology list.
 *
 * @param {SkillRow} row - Database row selected from skill groups.
 * @returns {SkillGroup} Validated skill group.
 */
export function toSkillGroup(row: SkillRow): SkillGroup {
  return assertSkillGroup({
    id: row.id,
    domain: text('domain', row.domain),
    techs: row.techs,
    usage: text('usage', row.usage),
    position: row.position,
  });
}

/**
 * Function toProfile
 *
 * @description
 * Converts the singleton profile row and its labeled facts into localized domain values.
 *
 * @param {ProfileRow} row - Database profile row.
 * @returns {Profile} Domain profile.
 */
export function toProfile(row: ProfileRow): Profile {
  return {
    heroIntro: text('heroIntro', row.heroIntro),
    aboutStatement: text('aboutStatement', row.aboutStatement),
    aboutLead: text('aboutLead', row.aboutLead),
    facts: row.facts.map((fact: ProfileRow['facts'][number]): Profile['facts'][number] => ({
      label: text('facts.label', fact.label),
      value: text('facts.value', fact.value),
    })),
  };
}
