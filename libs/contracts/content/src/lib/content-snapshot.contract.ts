import { z } from 'zod/mini';

/**
 * Constant ContentLocaleSchema
 *
 * @description
 * Restricts public snapshot requests and payloads to the supported French and English locales.
 */
export const ContentLocaleSchema = z.enum(['fr', 'en']);

/**
 * Type ContentLocale
 * @type ContentLocale
 *
 * @description
 * Locale identifier accepted for public content snapshots.
 */
export type ContentLocale = z.infer<typeof ContentLocaleSchema>;

/**
 * Constant ContentSnapshotQuerySchema
 *
 * @description
 * Validates the locale query parameter required to retrieve a public snapshot.
 */
export const ContentSnapshotQuerySchema = z.object({ locale: ContentLocaleSchema });

/**
 * Type ContentSnapshotQuery
 * @type ContentSnapshotQuery
 *
 * @description
 * Parsed query for selecting the locale of a public snapshot.
 */
export type ContentSnapshotQuery = z.infer<typeof ContentSnapshotQuerySchema>;

/**
 * Constant Text
 *
 * @description
 * Requires non-empty text in the translated public snapshot.
 */
const Text = z.string().check(z.minLength(1));

/**
 * Constant TechKeySchema
 *
 * @description
 * Restricts technology identifiers to lowercase kebab-case keys used by the frontend.
 */
const TechKeySchema = z.string().check(z.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/));

/**
 * Constant YearMonthSchema
 *
 * @description
 * Validates a calendar year and a month numbered from 1 through 12.
 */
const YearMonthSchema = z.object({
  year: z.int(),
  month: z.int().check(z.minimum(1), z.maximum(12)),
});

/**
 * Constant ProjectDtoSchema
 *
 * @description
 * Validates one published project after content has been translated into the requested locale.
 */
export const ProjectDtoSchema = z.object({
  slug: Text,
  title: Text,
  summary: Text,
  lead: Text,
  periodLabel: Text,
  client: Text,
  role: Text,
  place: Text,
  siteUrl: z.nullable(z.url()),
  techs: z.array(TechKeySchema),
  featured: z.boolean(),
  article: z.object({
    context: z.array(z.string()),
    work: z.array(z.string()),
    workList: z.array(z.string()),
    choices: z.array(z.string()),
    result: z.array(z.string()),
    lessons: z.array(z.string()),
    captions: z.array(z.string()),
  }),
});

/**
 * Type ProjectDto
 * @type ProjectDto
 *
 * @description
 * Localized project representation included in a public content snapshot.
 */
export type ProjectDto = z.infer<typeof ProjectDtoSchema>;

/**
 * Constant TimelineEntryDtoSchema
 *
 * @description
 * Validates an education or experience entry with start and optional end calendar months.
 */
export const TimelineEntryDtoSchema = z.object({
  id: Text,
  kind: z.enum(['education', 'experience']),
  title: Text,
  place: Text,
  description: Text,
  start: YearMonthSchema,
  end: z.nullable(YearMonthSchema),
  techs: z.array(TechKeySchema),
});

/**
 * Type TimelineEntryDto
 * @type TimelineEntryDto
 *
 * @description
 * Localized timeline item included in the public snapshot.
 */
export type TimelineEntryDto = z.infer<typeof TimelineEntryDtoSchema>;

/**
 * Constant SkillGroupDtoSchema
 *
 * @description
 * Validates a skill domain with at least one technology and its optional language label.
 */
export const SkillGroupDtoSchema = z.object({
  id: Text,
  domain: Text,
  techs: z
    .array(z.object({ key: TechKeySchema, language: z.nullable(z.string()) }))
    .check(z.minLength(1)),
  usage: Text,
});

/**
 * Type SkillGroupDto
 * @type SkillGroupDto
 *
 * @description
 * Localized skill group included in a public content snapshot.
 */
export type SkillGroupDto = z.infer<typeof SkillGroupDtoSchema>;

/**
 * Constant ProfileDtoSchema
 *
 * @description
 * Validates the localized introductory profile and its label-value facts.
 */
export const ProfileDtoSchema = z.object({
  heroIntro: Text,
  aboutStatement: Text,
  aboutLead: Text,
  facts: z.array(z.object({ label: Text, value: Text })),
});

/**
 * Type ProfileDto
 * @type ProfileDto
 *
 * @description
 * Localized profile section included in the public content snapshot.
 */
export type ProfileDto = z.infer<typeof ProfileDtoSchema>;

/**
 * Constant ContentSnapshotSchema
 *
 * @description
 * Validates the complete localized public payload, including its non-negative revision and all content sections.
 */
export const ContentSnapshotSchema = z.object({
  locale: ContentLocaleSchema,
  revision: z.int().check(z.nonnegative()),
  profile: ProfileDtoSchema,
  projects: z.array(ProjectDtoSchema),
  timeline: z.array(TimelineEntryDtoSchema),
  skills: z.array(SkillGroupDtoSchema),
});

/**
 * Type ContentSnapshot
 * @type ContentSnapshot
 *
 * @description
 * Fully parsed public content payload consumed by the portfolio site.
 */
export type ContentSnapshot = z.infer<typeof ContentSnapshotSchema>;
