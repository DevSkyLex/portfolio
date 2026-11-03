/**
 * Public contact request exports
 *
 * @description
 * Exposes the public contact submission schemas, validation bounds, error codes and inferred DTO types.
 */
export {
  CONTACT_ERROR_CODES,
  CONTACT_LIMITS,
  CONTACT_SUBJECTS,
  ContactMessageAcceptedSchema,
  ContactMessageRequestSchema,
  ContactSubjectSchema,
  type ContactMessageAccepted,
  type ContactMessageRequest,
  type ContactSubjectDto,
  type FieldErrorDto,
} from '@internal/contact-contracts/lib/contact-message.contract';

/**
 * Public inbox exports
 *
 * @description
 * Exposes administrator message, status and pagination schemas with their inferred response types.
 */
export {
  ContactMessageDtoSchema,
  ContactMessageListQuerySchema,
  ContactMessageListSchema,
  ContactMessageStatusSchema,
  type ContactMessageDto,
  type ContactMessageList,
  type ContactMessageListQuery,
  type ContactMessageStatusDto,
} from '@internal/contact-contracts/lib/admin-message.contract';
