import { z } from 'zod/mini';
import { EditableArticleDocumentSchema } from '@internal/content-contracts/lib/article-document.contract';
import { MediaDtoSchema } from '@internal/content-contracts/lib/media.contract';
import { ProjectSeoDtoSchema } from '@internal/content-contracts/lib/project-seo.contract';

/**
 * Constant Text
 *
 * @description
 * Requires non-empty trimmed text within the administrator API's 4,000-character field limit.
 */
const Text = z.string().check(z.trim(), z.minLength(1), z.maxLength(4000));

/**
 * Constant LocalizedTextDtoSchema
 *
 * @description
 * Validates required French text with an optional English translation for editable project content.
 */
export const LocalizedTextDtoSchema = z.object({
  fr: Text,
  en: z.optional(z.string().check(z.trim(), z.maxLength(4000))),
});

/** Identifies the editorial collection that owns a publication. */
export const PublicationKindSchema = z.enum(['project', 'article']);
export type PublicationKindDto = z.infer<typeof PublicationKindSchema>;

/** Selects a collection while preserving existing project requests. */
export const PublicationKindQuerySchema = z.object({
  kind: z._default(PublicationKindSchema, 'project'),
});
export type PublicationKindQuery = z.infer<typeof PublicationKindQuerySchema>;

export const PUBLICATION_TAXONOMY_LIMITS = { key: 80, label: 80, tags: 24 } as const;

/** Locale-independent key used to group articles across translations. */
export const PublicationTaxonKeySchema = z
  .string()
  .check(z.maxLength(PUBLICATION_TAXONOMY_LIMITS.key), z.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/));

const TaxonLabel = z.string().check(z.trim(), z.maxLength(PUBLICATION_TAXONOMY_LIMITS.label));
const PublicationTaxonSchema = z.object({
  key: PublicationTaxonKeySchema,
  label: z.object({ fr: TaxonLabel.check(z.minLength(1)), en: z.optional(TaxonLabel) }),
});

/** A draft may lack a category or English labels. Publication checks them in the domain. */
export const PublicationTaxonomySchema = z.object({
  category: z.nullable(PublicationTaxonSchema),
  tags: z.array(PublicationTaxonSchema).check(
    z.maxLength(PUBLICATION_TAXONOMY_LIMITS.tags),
    z.refine((tags): boolean => new Set(tags.map((tag) => tag.key)).size === tags.length, {
      message: 'Each tag key must occur only once.',
    }),
  ),
});
export type PublicationTaxonomyDto = z.infer<typeof PublicationTaxonomySchema>;

/**
 * Type LocalizedTextDto
 * @type LocalizedTextDto
 *
 * @description
 * Bilingual project text with French required and English optional until publication.
 */
export type LocalizedTextDto = z.infer<typeof LocalizedTextDtoSchema>;

/**
 * Constant AltText
 *
 * @description
 * Alternative text of an image, empty while a draft still lacks it.
 */
const AltText = z.string().check(z.trim(), z.maxLength(300));

/**
 * Constant ProjectCoverDtoSchema
 *
 * @description
 * Cover image of a project: an uploaded media and its localized alternative text.
 */
export const ProjectCoverDtoSchema = z.object({
  media: z.uuid(),
  alt: z.object({ fr: AltText, en: z.optional(AltText) }),
});

/**
 * Type ProjectCoverDto
 * @type ProjectCoverDto
 *
 * @description
 * Project cover referencing an uploaded media.
 */
export type ProjectCoverDto = z.infer<typeof ProjectCoverDtoSchema>;

/**
 * Constant PROJECT_PERIOD_LIMITS
 *
 * @description
 * Accepted years of a project period, those of the timeline entries (`TIMELINE_ENTRY_LIMITS`),
 * mirrored by the domain's `ProjectPeriod` and by the admin form's picker bounds (D10, D46).
 */
export const PROJECT_PERIOD_LIMITS = { yearMin: 1990, yearMax: 2100 } as const;

/**
 * Constant ProjectPeriodBoundDtoSchema
 *
 * @description
 * One end of a project period: a four-digit year and a one-based month, or `null` for the whole year.
 */
export const ProjectPeriodBoundDtoSchema = z.object({
  year: z
    .int()
    .check(z.minimum(PROJECT_PERIOD_LIMITS.yearMin), z.maximum(PROJECT_PERIOD_LIMITS.yearMax)),
  month: z.nullable(z.int().check(z.minimum(1), z.maximum(12))),
});

/**
 * Type ProjectPeriodBoundDto
 * @type ProjectPeriodBoundDto
 *
 * @description
 * Year, with a month or for the whole year.
 */
export type ProjectPeriodBoundDto = z.infer<typeof ProjectPeriodBoundDtoSchema>;

/**
 * Constant ProjectPeriodDtoSchema
 *
 * @description
 * Period of a project (D46): its start and its end, `null` while ongoing. The end does not precede
 * the start: by year, then by month when both ends have one. The public snapshot keeps the label the
 * service writes from it (`periodLabel`).
 */
export const ProjectPeriodDtoSchema = z
  .object({ start: ProjectPeriodBoundDtoSchema, end: z.nullable(ProjectPeriodBoundDtoSchema) })
  .check(
    z.refine(
      (period: { start: ProjectPeriodBoundDto; end: ProjectPeriodBoundDto | null }): boolean =>
        period.end === null ||
        period.end.year > period.start.year ||
        (period.end.year === period.start.year &&
          (period.end.month === null ||
            period.start.month === null ||
            period.end.month >= period.start.month)),
      { message: 'The end precedes the start.', path: ['end'] },
    ),
  );

/**
 * Type ProjectPeriodDto
 * @type ProjectPeriodDto
 *
 * @description
 * Start and end of a project, the end `null` while ongoing.
 */
export type ProjectPeriodDto = z.infer<typeof ProjectPeriodDtoSchema>;

/**
 * Constant ProjectRevisionRequestSchema
 *
 * @description
 * Validates editable project fields, the period, the article document of each language, the cover,
 * HTTPS links and normalized technology keys.
 */
export const ProjectRevisionRequestSchema = z.object({
  title: LocalizedTextDtoSchema,
  summary: LocalizedTextDtoSchema,
  lead: LocalizedTextDtoSchema,
  period: ProjectPeriodDtoSchema,
  client: LocalizedTextDtoSchema,
  role: LocalizedTextDtoSchema,
  place: LocalizedTextDtoSchema,
  siteUrl: z.nullable(z.url({ protocol: /^https$/ })),
  techs: z.array(z.string().check(z.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))).check(z.maxLength(12)),
  featured: z.boolean(),
  article: z.object({
    fr: EditableArticleDocumentSchema,
    en: z.optional(EditableArticleDocumentSchema),
  }),
  cover: z.nullable(ProjectCoverDtoSchema),
  seo: ProjectSeoDtoSchema,
  taxonomy: z.optional(PublicationTaxonomySchema),
});

/**
 * Type ProjectRevisionRequest
 * @type ProjectRevisionRequest
 *
 * @description
 * Parsed project revision submitted through the administrator API.
 */
export type ProjectRevisionRequest = z.infer<typeof ProjectRevisionRequestSchema>;

/**
 * Constant AdminProjectDtoSchema
 *
 * @description
 * Validates the editable project payload together with its identity, publication state, version and position.
 */
export const AdminProjectDtoSchema = z.extend(ProjectRevisionRequestSchema, {
  id: z.string(),
  slug: z.string(),
  kind: z.optional(PublicationKindSchema),
  status: z.enum(['draft', 'published']),
  version: z.int(),
  position: z.int(),
  /** Fields to fill in before publishing (`title.en`, `article.en`, `cover.alt.en`…); empty if publishable. */
  missing: z.array(z.string()),
  /** Media referenced by the cover and the article figures, to display them in the editor. */
  media: z.array(MediaDtoSchema),
});

/**
 * Type AdminProjectDto
 * @type AdminProjectDto
 *
 * @description
 * Project representation returned to the administrator, including publication readiness details.
 */
export type AdminProjectDto = z.infer<typeof AdminProjectDtoSchema>;

/**
 * Constant AdminProjectListSchema
 *
 * @description
 * Validates the administrator project collection and its total item count.
 */
export const AdminProjectListSchema = z.object({
  member: z.array(AdminProjectDtoSchema),
  totalItems: z.int(),
});

/**
 * Type AdminProjectList
 * @type AdminProjectList
 *
 * @description
 * Project list response returned by the administrator API.
 */
export type AdminProjectList = z.infer<typeof AdminProjectListSchema>;

/** Article editors use taxonomy. The former technology field remains accepted for older clients. */
export const ArticleRevisionRequestSchema = z.extend(ProjectRevisionRequestSchema, {
  techs: z.optional(ProjectRevisionRequestSchema.shape.techs),
});
export type ArticleRevisionRequest = z.infer<typeof ArticleRevisionRequestSchema>;

/** The canonical article representation exposes its taxonomy even for legacy records. */
export const AdminArticleDtoSchema = z.extend(AdminProjectDtoSchema, {
  taxonomy: PublicationTaxonomySchema,
});
export type AdminArticleDto = z.infer<typeof AdminArticleDtoSchema>;

/** All articles, including formerly separate project records. */
export const AdminArticleListSchema = z.object({
  member: z.array(AdminArticleDtoSchema),
  totalItems: z.int(),
});
export type AdminArticleList = z.infer<typeof AdminArticleListSchema>;

/**
 * Constant CONTENT_ADMIN_ERROR_CODES
 *
 * @description
 * Stable problem response codes used by project administration operations.
 */
export const CONTENT_ADMIN_ERROR_CODES = {
  versionMismatch: 'content.version-mismatch',
  preconditionRequired: 'request.precondition-required',
  incomplete: 'content.project-incomplete',
  notFound: 'content.not-found',
} as const;
