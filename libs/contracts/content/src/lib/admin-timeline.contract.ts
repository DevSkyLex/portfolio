import { z } from 'zod/mini';

/**
 * Constant TIMELINE_ENTRY_LIMITS
 *
 * @description
 * Bounds of a timeline entry, mirrored by the domain's `TIMELINE_ENTRY_LIMITS` and by the admin form's
 * browser copy (D10): longest trimmed text per locale, largest technology list, accepted years and
 * largest reorder request.
 */
export const TIMELINE_ENTRY_LIMITS = {
  title: 120,
  place: 120,
  description: 600,
  techs: 12,
  yearMin: 1990,
  yearMax: 2100,
  entries: 100,
} as const;

/**
 * Constant TimelineKindSchema
 *
 * @description
 * Kind of a timeline entry, also the `:kind` segment of the administration routes.
 */
export const TimelineKindSchema = z.enum(['education', 'experience']);

/**
 * Type TimelineKindDto
 * @type TimelineKindDto
 *
 * @description
 * Education or experience.
 */
export type TimelineKindDto = z.infer<typeof TimelineKindSchema>;

/**
 * Constant ShortText
 *
 * @description
 * Title or place per locale, French required; an English text left out (or blank) is refused by the
 * service with `content.timeline-entry-incomplete`, since entries are public at once.
 */
const ShortText = z.object({
  fr: z.string().check(z.trim(), z.minLength(1), z.maxLength(TIMELINE_ENTRY_LIMITS.title)),
  en: z.optional(z.string().check(z.trim(), z.maxLength(TIMELINE_ENTRY_LIMITS.title))),
});

/**
 * Constant LongText
 *
 * @description
 * Description per locale, with the same French and English rules as `ShortText`.
 */
const LongText = z.object({
  fr: z.string().check(z.trim(), z.minLength(1), z.maxLength(TIMELINE_ENTRY_LIMITS.description)),
  en: z.optional(z.string().check(z.trim(), z.maxLength(TIMELINE_ENTRY_LIMITS.description))),
});

/**
 * Constant YearMonthDtoSchema
 *
 * @description
 * Month with a four-digit year within the accepted range.
 */
export const YearMonthDtoSchema = z.object({
  year: z
    .int()
    .check(z.minimum(TIMELINE_ENTRY_LIMITS.yearMin), z.maximum(TIMELINE_ENTRY_LIMITS.yearMax)),
  month: z.int().check(z.minimum(1), z.maximum(12)),
});

/**
 * Type YearMonthDto
 * @type YearMonthDto
 *
 * @description
 * Year and one-based month.
 */
export type YearMonthDto = z.infer<typeof YearMonthDtoSchema>;

/**
 * Function monthIndex
 *
 * @description
 * Monotonic index of a month, to compare two of them.
 *
 * @param {YearMonthDto} value - Month.
 * @returns {number} Month index.
 */
const monthIndex = (value: YearMonthDto): number => value.year * 12 + value.month;

/**
 * Constant TimelineEntryFields
 *
 * @description
 * Fields of an entry's content, extended without the cross-field check by the administration DTO
 * (Zod refuses to extend a refined object).
 */
const TimelineEntryFields = z.object({
  title: ShortText,
  place: ShortText,
  description: LongText,
  start: YearMonthDtoSchema,
  end: z.nullable(YearMonthDtoSchema),
  techs: z
    .array(z.string().check(z.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)))
    .check(z.maxLength(TIMELINE_ENTRY_LIMITS.techs)),
});

/**
 * Constant TimelineEntryRequestSchema
 *
 * @description
 * Body of an entry creation or revision: texts per locale, first month, last month (`null` while
 * ongoing, « En cours ») not before the first, and up to 12 distinct-by-format technology keys.
 */
export const TimelineEntryRequestSchema = z
  .extend(TimelineEntryFields, {})
  .check(
    z.refine(
      (entry: { start: YearMonthDto; end: YearMonthDto | null }): boolean =>
        entry.end === null || monthIndex(entry.end) >= monthIndex(entry.start),
      { message: 'The end month precedes the start month.', path: ['end'] },
    ),
  );

/**
 * Type TimelineEntryRequest
 * @type TimelineEntryRequest
 *
 * @description
 * Validated entry content.
 */
export type TimelineEntryRequest = z.infer<typeof TimelineEntryRequestSchema>;

/**
 * Constant AdminTimelineEntryDtoSchema
 *
 * @description
 * Entry as the administration reads it: its content, identity, kind, position within the kind and
 * version (also its `ETag`).
 */
export const AdminTimelineEntryDtoSchema = z.extend(TimelineEntryFields, {
  id: z.string().check(z.minLength(1)),
  kind: TimelineKindSchema,
  position: z.int().check(z.nonnegative()),
  version: z.int().check(z.minimum(1)),
});

/**
 * Type AdminTimelineEntryDto
 * @type AdminTimelineEntryDto
 *
 * @description
 * Administration entry.
 */
export type AdminTimelineEntryDto = z.infer<typeof AdminTimelineEntryDtoSchema>;

/**
 * Constant AdminTimelineListSchema
 *
 * @description
 * Entries of one kind by position, with the list version (also the `ETag`) a reorder quotes in
 * `If-Match`.
 */
export const AdminTimelineListSchema = z.object({
  kind: TimelineKindSchema,
  version: z.int().check(z.minimum(1)),
  member: z.array(AdminTimelineEntryDtoSchema),
  totalItems: z.int().check(z.nonnegative()),
});

/**
 * Type AdminTimelineList
 * @type AdminTimelineList
 *
 * @description
 * Administration list of one kind.
 */
export type AdminTimelineList = z.infer<typeof AdminTimelineListSchema>;

/**
 * Constant TimelineOrderRequestSchema
 *
 * @description
 * Body of a reorder: every entry identifier of the kind, once each, in the wanted order.
 */
export const TimelineOrderRequestSchema = z.object({
  ids: z.array(z.string().check(z.minLength(1))).check(
    z.maxLength(TIMELINE_ENTRY_LIMITS.entries),
    z.refine((ids: readonly string[]): boolean => new Set(ids).size === ids.length, {
      message: 'Each entry may appear only once.',
    }),
  ),
});

/**
 * Type TimelineOrderRequest
 * @type TimelineOrderRequest
 *
 * @description
 * Wanted order of a kind.
 */
export type TimelineOrderRequest = z.infer<typeof TimelineOrderRequestSchema>;

/**
 * Constant TIMELINE_ERROR_CODES
 *
 * @description
 * Problem codes of the timeline administration besides `request.invalid` (400) and
 * `request.precondition-required` (428): a stale entry or list version (412), an unknown entry or one
 * of the other kind (404), a missing English text and an order that is not a permutation (422).
 */
export const TIMELINE_ERROR_CODES = {
  versionMismatch: 'content.version-mismatch',
  notFound: 'content.not-found',
  incomplete: 'content.timeline-entry-incomplete',
  orderInvalid: 'content.timeline-order-invalid',
  invalidValue: 'content.invalid-value',
} as const;
