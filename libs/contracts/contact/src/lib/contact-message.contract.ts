import { z } from 'zod/mini';

/**
 * Constant CONTACT_SUBJECTS
 *
 * @description
 * Subject choices accepted by the public contact form and its domain model.
 */
export const CONTACT_SUBJECTS = ['project', 'job', 'other'] as const;

/**
 * Constant CONTACT_LIMITS
 *
 * @description
 * Character limits shared by request validation and the contact domain.
 */
export const CONTACT_LIMITS = {
  name: 100,
  company: 120,
  email: 254,
  messageMin: 20,
  messageMax: 2000,
} as const;

/**
 * Constant ContactSubjectSchema
 *
 * @description
 * Validates a subject against the supported contact request choices.
 */
export const ContactSubjectSchema = z.enum(CONTACT_SUBJECTS);

/**
 * Type ContactSubjectDto
 * @type ContactSubjectDto
 *
 * @description
 * Subject value accepted by the public contact request contract.
 */
export type ContactSubjectDto = z.infer<typeof ContactSubjectSchema>;

/**
 * Constant ContactMessageRequestSchema
 *
 * @description
 * Validates the public contact submission, trimming bounded text and checking email syntax and locale.
 * The optional website honeypot is consumed by the application as a silent bot signal.
 */
export const ContactMessageRequestSchema = z.object({
  name: z.string().check(z.trim(), z.minLength(1), z.maxLength(CONTACT_LIMITS.name)),
  company: z.optional(z.nullable(z.string().check(z.trim(), z.maxLength(CONTACT_LIMITS.company)))),
  email: z
    .string()
    .check(z.trim(), z.maxLength(CONTACT_LIMITS.email), z.regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  subject: ContactSubjectSchema,
  message: z
    .string()
    .check(
      z.trim(),
      z.minLength(CONTACT_LIMITS.messageMin),
      z.maxLength(CONTACT_LIMITS.messageMax),
    ),
  locale: z.enum(['fr', 'en']),
  /** Invisible honeypot field: only filled in by a bot. The message is then silently dropped. */
  website: z.optional(z.string()),
});

/**
 * Type ContactMessageRequest
 * @type ContactMessageRequest
 *
 * @description
 * Parsed public contact submission, including the optional honeypot field.
 */
export type ContactMessageRequest = z.infer<typeof ContactMessageRequestSchema>;

/**
 * Constant ContactMessageAcceptedSchema
 *
 * @description
 * Validates the fixed acknowledgement returned after a contact submission is accepted.
 */
export const ContactMessageAcceptedSchema = z.object({ status: z.literal('received') });

/**
 * Type ContactMessageAccepted
 * @type ContactMessageAccepted
 *
 * @description
 * Acknowledgement shape returned by the public contact endpoint.
 */
export type ContactMessageAccepted = z.infer<typeof ContactMessageAcceptedSchema>;

/**
 * Constant CONTACT_ERROR_CODES
 *
 * @description
 * Stable problem response codes that the public contact client can handle explicitly.
 */
export const CONTACT_ERROR_CODES = {
  invalidRequest: 'request.invalid',
  invalidValue: 'contact.invalid-value',
  rateLimited: 'contact.rate-limited',
} as const;

/**
 * Interface FieldErrorDto
 * @interface FieldErrorDto
 *
 * @description
 * Identifies one invalid request field and the corresponding user-facing validation message.
 */
export interface FieldErrorDto {
  // #region Properties
  /**
   * Property field
   * @readonly
   *
   * @description
   * Dot-separated request path associated with this validation error.
   *
   * @type {string}
   */
  readonly field: string;

  /**
   * Property message
   * @readonly
   *
   * @description
   * Validation explanation for the associated request path.
   *
   * @type {string}
   */
  readonly message: string;
  // #endregion
}
