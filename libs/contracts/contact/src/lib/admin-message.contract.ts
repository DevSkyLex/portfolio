import { z } from 'zod/mini';
import { ContactSubjectSchema } from '@internal/contact-contracts/lib/contact-message.contract';

/**
 * Constant ContactMessageStatusSchema
 *
 * @description
 * Restricts inbox messages to the three states used by the administrator workflow.
 */
export const ContactMessageStatusSchema = z.enum(['received', 'read', 'archived']);

/**
 * Type ContactMessageStatusDto
 * @type ContactMessageStatusDto
 *
 * @description
 * Status value accepted and returned by the administrator inbox API.
 */
export type ContactMessageStatusDto = z.infer<typeof ContactMessageStatusSchema>;

/**
 * Constant ContactMessageListQuerySchema
 *
 * @description
 * Validates inbox filters and pagination, defaulting to page 1 with 20 results and limiting pages to 50.
 */
export const ContactMessageListQuerySchema = z.object({
  status: z.optional(ContactMessageStatusSchema),
  page: z._default(z.coerce.number().check(z.int(), z.minimum(1)), 1),
  pageSize: z._default(z.coerce.number().check(z.int(), z.minimum(1), z.maximum(50)), 20),
});

/**
 * Type ContactMessageListQuery
 * @type ContactMessageListQuery
 *
 * @description
 * Parsed status filter and one-based pagination for administrator inbox requests.
 */
export type ContactMessageListQuery = z.infer<typeof ContactMessageListQuerySchema>;

/**
 * Constant ContactMessageDtoSchema
 *
 * @description
 * Validates an administrator inbox record, including its status and optimistic-lock version.
 */
export const ContactMessageDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  company: z.nullable(z.string()),
  email: z.string(),
  subject: ContactSubjectSchema,
  message: z.string(),
  locale: z.enum(['fr', 'en']),
  status: ContactMessageStatusSchema,
  receivedAt: z.string(),
  purgeAt: z.string(),
  version: z.int(),
});

/**
 * Type ContactMessageDto
 * @type ContactMessageDto
 *
 * @description
 * Message record exposed by the administrator inbox API.
 */
export type ContactMessageDto = z.infer<typeof ContactMessageDtoSchema>;

/**
 * Constant ContactMessageListSchema
 *
 * @description
 * Validates a page of inbox records with the total matching count and effective page settings.
 */
export const ContactMessageListSchema = z.object({
  member: z.array(ContactMessageDtoSchema),
  totalItems: z.int(),
  view: z.object({ page: z.int(), pageSize: z.int() }),
});

/**
 * Type ContactMessageList
 * @type ContactMessageList
 *
 * @description
 * Paginated inbox response returned by the administrator API.
 */
export type ContactMessageList = z.infer<typeof ContactMessageListSchema>;
