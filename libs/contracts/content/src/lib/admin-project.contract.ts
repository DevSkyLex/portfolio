import { z } from 'zod/mini';

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

/**
 * Type LocalizedTextDto
 * @type LocalizedTextDto
 *
 * @description
 * Bilingual project text with French required and English optional until publication.
 */
export type LocalizedTextDto = z.infer<typeof LocalizedTextDtoSchema>;

/**
 * Constant Paragraphs
 *
 * @description
 * Validates an ordered list of at most 30 localized paragraphs or captions.
 */
const Paragraphs = z.array(LocalizedTextDtoSchema).check(z.maxLength(30));

/**
 * Constant ProjectRevisionRequestSchema
 *
 * @description
 * Validates editable project fields, bilingual article sections, HTTPS links and normalized technology keys.
 */
export const ProjectRevisionRequestSchema = z.object({
  title: LocalizedTextDtoSchema,
  summary: LocalizedTextDtoSchema,
  lead: LocalizedTextDtoSchema,
  periodLabel: LocalizedTextDtoSchema,
  client: LocalizedTextDtoSchema,
  role: LocalizedTextDtoSchema,
  place: LocalizedTextDtoSchema,
  siteUrl: z.nullable(z.url({ protocol: /^https$/ })),
  techs: z.array(z.string().check(z.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))).check(z.maxLength(12)),
  featured: z.boolean(),
  article: z.object({
    context: Paragraphs,
    work: Paragraphs,
    workList: Paragraphs,
    choices: Paragraphs,
    result: Paragraphs,
    lessons: Paragraphs,
    captions: Paragraphs,
  }),
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
  status: z.enum(['draft', 'published']),
  version: z.int(),
  position: z.int(),
  /** Fields to fill in before publishing (`title.en`, `article.context.en`…); empty if publishable. */
  missing: z.array(z.string()),
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
