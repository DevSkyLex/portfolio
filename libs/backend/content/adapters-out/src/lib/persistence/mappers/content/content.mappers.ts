import type { MediaRecord } from '@vfortin/content-application';
import {
  ArticleDocument,
  LegalDocument,
  LocalizedText,
  Period,
  type Profile,
  Project,
  ProjectPeriod,
  ProjectSeo,
  type SkillGroup,
  Slug,
  TimelineEntry,
  type YearMonth,
  assertSkillGroup,
  profileLinks,
} from '@vfortin/content-domain';
import type {
  legalDocuments,
  media,
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
 * Type MediaRow
 * @type MediaRow
 *
 * @description
 * Drizzle select shape for an uploaded media.
 */
export type MediaRow = typeof media.$inferSelect;

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
 * Rehydrates a project row into domain values, validating the slug, localized fields, period, article
 * documents, cover and search texts before exposing it to application code.
 *
 * @param {ProjectRow} row - Database row selected from the projects table.
 * @returns {Project} Validated project aggregate.
 */
export function toProject(row: ProjectRow): Project {
  return Project.rehydrate({
    id: row.id,
    slug: Slug.of(row.slug),
    title: text('title', row.title),
    summary: text('summary', row.summary),
    lead: text('lead', row.lead),
    period: ProjectPeriod.of(row.period),
    client: text('client', row.client),
    role: text('role', row.role),
    place: text('place', row.place),
    siteUrl: row.siteUrl,
    techs: row.techs,
    featured: row.featured,
    position: row.position,
    status: row.status,
    version: row.version,
    article:
      row.article.en === undefined
        ? { fr: ArticleDocument.of('article.fr', row.article.fr) }
        : {
            fr: ArticleDocument.of('article.fr', row.article.fr),
            en: ArticleDocument.of('article.en', row.article.en),
          },
    cover: row.cover,
    seo: ProjectSeo.of({ ...row.seo, keywords: row.seoKeywords }),
  });
}

/**
 * Function toMediaRecord
 *
 * @description
 * Converts a media row into the application record.
 *
 * @param {MediaRow} row - Database row selected from the media table.
 * @returns {MediaRecord} Media record.
 */
export function toMediaRecord(row: MediaRow): MediaRecord {
  return {
    id: row.id,
    width: row.width,
    height: row.height,
    bytes: row.bytes,
    sha256: row.sha256,
    hasSmall: row.hasSmall,
    createdAt: row.createdAt,
    unlinkedAt: row.unlinkedAt,
  };
}

/**
 * Function toTimelineEntry
 *
 * @description
 * Converts stored date columns, localized text, position and version into a validated timeline
 * entry.
 *
 * @param {TimelineRow} row - Database row selected from timeline entries.
 * @returns {TimelineEntry} Domain timeline entry.
 */
export function toTimelineEntry(row: TimelineRow): TimelineEntry {
  const end: YearMonth | null =
    row.endYear === null || row.endMonth === null
      ? null
      : { year: row.endYear, month: row.endMonth };
  return TimelineEntry.rehydrate({
    id: row.id,
    kind: row.kind,
    title: text('title', row.title),
    place: text('place', row.place),
    description: text('description', row.description),
    period: Period.of({ year: row.startYear, month: row.startMonth }, end),
    techs: row.techs,
    position: row.position,
    version: row.version,
  });
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
    links: profileLinks(row.links),
    version: row.version,
  };
}

/**
 * Function toProfileRow
 *
 * @description
 * Converts the editable fields of a profile into the columns of the singleton row.
 *
 * @param {Profile} value - Profile to store.
 * @returns {Pick<ProfileRow, 'heroIntro' | 'aboutStatement' | 'aboutLead' | 'facts' | 'links'>} Columns.
 */
export function toProfileRow(
  value: Profile,
): Pick<ProfileRow, 'heroIntro' | 'aboutStatement' | 'aboutLead' | 'facts' | 'links'> {
  return {
    heroIntro: value.heroIntro.toProps(),
    aboutStatement: value.aboutStatement.toProps(),
    aboutLead: value.aboutLead.toProps(),
    facts: value.facts.map((fact: Profile['facts'][number]): ProfileRow['facts'][number] => ({
      label: fact.label.toProps(),
      value: fact.value.toProps(),
    })),
    links: value.links.map((link: Profile['links'][number]): ProfileRow['links'][number] =>
      link.toProps(),
    ),
  };
}

/**
 * Function toLegalDocument
 *
 * @description
 * Rehydrates a legal document row, validating both documents.
 *
 * @param {typeof legalDocuments.$inferSelect} row - Database row.
 * @returns {LegalDocument} Domain aggregate.
 */
export function toLegalDocument(row: typeof legalDocuments.$inferSelect): LegalDocument {
  return LegalDocument.rehydrate({
    kind: row.kind,
    body: LegalDocument.bodyOf(row.body),
    updatedAt: row.updatedAt,
    version: row.version,
  });
}

/**
 * Function toTimelineRow
 *
 * @description
 * Converts a timeline entry into its row, an ongoing period leaving both end columns empty.
 *
 * @param {TimelineEntry} entry - Entry to store.
 * @returns {typeof timelineEntries.$inferInsert} Row values.
 */
export function toTimelineRow(entry: TimelineEntry): typeof timelineEntries.$inferInsert {
  const { id, kind, title, place, description, period, techs, position, version } =
    entry.snapshot();
  return {
    id,
    kind,
    title: title.toProps(),
    place: place.toProps(),
    description: description.toProps(),
    startYear: period.start.year,
    startMonth: period.start.month,
    endYear: period.end?.year ?? null,
    endMonth: period.end?.month ?? null,
    techs: [...techs],
    position,
    version,
  };
}
