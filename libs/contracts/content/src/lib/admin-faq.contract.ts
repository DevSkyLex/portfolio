import { z } from 'zod/mini';

/**
 * Constant FAQ_ENTRY_LIMITS
 *
 * @description
 * Bounds of a FAQ entry, mirrored by the domain's `FAQ_ENTRY_LIMITS` and by the admin form's browser
 * copy (D10): longest trimmed question and answer per locale, and largest reorder request.
 */
export const FAQ_ENTRY_LIMITS = {
  question: 200,
  answer: 2000,
  entries: 100,
} as const;

/**
 * Constant Question
 *
 * @description
 * Question per locale, French required; an English text left out (or blank) is refused by the
 * service with `content.faq-entry-incomplete`, since entries are public at once.
 */
const Question = z.object({
  fr: z.string().check(z.trim(), z.minLength(1), z.maxLength(FAQ_ENTRY_LIMITS.question)),
  en: z.optional(z.string().check(z.trim(), z.maxLength(FAQ_ENTRY_LIMITS.question))),
});

/**
 * Constant Answer
 *
 * @description
 * Plain-text answer per locale, with the same French and English rules as `Question`.
 */
const Answer = z.object({
  fr: z.string().check(z.trim(), z.minLength(1), z.maxLength(FAQ_ENTRY_LIMITS.answer)),
  en: z.optional(z.string().check(z.trim(), z.maxLength(FAQ_ENTRY_LIMITS.answer))),
});

/**
 * Constant FaqEntryRequestSchema
 *
 * @description
 * Body of a FAQ entry creation or revision: the question and its answer per locale.
 */
export const FaqEntryRequestSchema = z.object({
  question: Question,
  answer: Answer,
});

/**
 * Type FaqEntryRequest
 * @type FaqEntryRequest
 *
 * @description
 * Validated FAQ entry content.
 */
export type FaqEntryRequest = z.infer<typeof FaqEntryRequestSchema>;

/**
 * Constant AdminFaqEntryDtoSchema
 *
 * @description
 * Entry as the administration reads it: its content, identity, position and version (also its
 * `ETag`).
 */
export const AdminFaqEntryDtoSchema = z.extend(FaqEntryRequestSchema, {
  id: z.string().check(z.minLength(1)),
  position: z.int().check(z.nonnegative()),
  version: z.int().check(z.minimum(1)),
});

/**
 * Type AdminFaqEntryDto
 * @type AdminFaqEntryDto
 *
 * @description
 * Administration FAQ entry.
 */
export type AdminFaqEntryDto = z.infer<typeof AdminFaqEntryDtoSchema>;

/**
 * Constant AdminFaqListSchema
 *
 * @description
 * Entries by position, with the list version (also the `ETag`) a reorder quotes in `If-Match`.
 */
export const AdminFaqListSchema = z.object({
  version: z.int().check(z.minimum(1)),
  member: z.array(AdminFaqEntryDtoSchema),
  totalItems: z.int().check(z.nonnegative()),
});

/**
 * Type AdminFaqList
 * @type AdminFaqList
 *
 * @description
 * Administration FAQ list.
 */
export type AdminFaqList = z.infer<typeof AdminFaqListSchema>;

/**
 * Constant FaqOrderRequestSchema
 *
 * @description
 * Body of a reorder: every entry identifier, once each, in the wanted order.
 */
export const FaqOrderRequestSchema = z.object({
  ids: z.array(z.string().check(z.minLength(1))).check(
    z.maxLength(FAQ_ENTRY_LIMITS.entries),
    z.refine((ids: readonly string[]): boolean => new Set(ids).size === ids.length, {
      message: 'Each entry may appear only once.',
    }),
  ),
});

/**
 * Type FaqOrderRequest
 * @type FaqOrderRequest
 *
 * @description
 * Wanted order of the FAQ.
 */
export type FaqOrderRequest = z.infer<typeof FaqOrderRequestSchema>;

/**
 * Constant FAQ_ERROR_CODES
 *
 * @description
 * Problem codes of the FAQ administration besides `request.invalid` (400) and
 * `request.precondition-required` (428): a stale entry or list version (412), an unknown entry
 * (404), a missing English text and an order that is not a permutation (422).
 */
export const FAQ_ERROR_CODES = {
  versionMismatch: 'content.version-mismatch',
  notFound: 'content.not-found',
  incomplete: 'content.faq-entry-incomplete',
  orderInvalid: 'content.faq-order-invalid',
  invalidValue: 'content.invalid-value',
} as const;
