import type { MediaRecord } from '@vfortin/content-application';
import {
  ArticleDocument,
  FaqEntry,
  LegalDocument,
  LocalizedText,
  Period,
  type Profile,
  Article,
  ProjectPeriod,
  ArticleSeo,
  type SkillGroup,
  Slug,
  TimelineEntry,
  type YearMonth,
  assertSkillGroup,
  profileLinks,
} from '@vfortin/content-domain';
import type {
  faqEntries,
  legalDocuments,
  media,
  profile,
  projects,
  skillGroups,
  timelineEntries,
} from '@internal/content-adapters-out/lib/persistence/schema/content.schema';

/**
 * Type ArticleRow
 * @type ArticleRow
 *
 * @description
 * Drizzle select shape for the persisted projects table.
 */
type ArticleRow = typeof projects.$inferSelect;

/**
 * Type TimelineRow
 * @type TimelineRow
 *
 * @description
 * Drizzle select shape for a persisted timeline entry.
 */
type TimelineRow = typeof timelineEntries.$inferSelect;

/**
 * Type FaqRow
 * @type FaqRow
 *
 * @description
 * Drizzle select shape for a persisted FAQ entry.
 */
type FaqRow = typeof faqEntries.$inferSelect;

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
 * Function toArticle
 *
 * @description
 * Rehydrates a project row into domain values, validating the slug, localized fields, period, article
 * documents, cover and search texts before exposing it to application code.
 *
 * @param {ArticleRow} row - Database row selected from the projects table.
 * @returns {Article} Validated project aggregate.
 */
export function toArticle(row: ArticleRow): Article {
  return Article.rehydrate({
    id: row.id,
    kind: row.kind,
    taxonomy:
      row.taxonomy == null
        ? undefined
        : {
            category:
              row.taxonomy.category === null
                ? null
                : {
                    key: row.taxonomy.category.key,
                    label: text('taxonomy.category.label', row.taxonomy.category.label),
                  },
            tags: row.taxonomy.tags.map((tag) => ({
              key: tag.key,
              label: text('taxonomy.tags.label', tag.label),
            })),
          },
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
    seo: ArticleSeo.of({ ...row.seo, keywords: row.seoKeywords }),
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
    kind: row.kind,
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
 * Function toFaqEntry
 *
 * @description
 * Converts stored localized texts, position and version into a validated FAQ entry.
 *
 * @param {FaqRow} row - Database row selected from FAQ entries.
 * @returns {FaqEntry} Domain FAQ entry.
 */
export function toFaqEntry(row: FaqRow): FaqEntry {
  return FaqEntry.rehydrate({
    id: row.id,
    question: text('question', row.question),
    answer: text('answer', row.answer),
    position: row.position,
    version: row.version,
  });
}

/**
 * Function toFaqRow
 *
 * @description
 * Converts a FAQ entry into its row.
 *
 * @param {FaqEntry} entry - Entry to store.
 * @returns {typeof faqEntries.$inferInsert} Row values.
 */
export function toFaqRow(entry: FaqEntry): typeof faqEntries.$inferInsert {
  const { id, question, answer, position, version } = entry.snapshot();
  return {
    id,
    question: question.toProps(),
    answer: answer.toProps(),
    position,
    version,
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
