import { HttpStatus } from '@nestjs/common';
import type { ProblemMapper } from '@vfortin/backend-http';
import {
  NotFoundError,
  RateLimitedError,
  VersionMismatchError,
} from '@vfortin/contact-application';
import { DomainError } from '@vfortin/contact-domain';
import type { FieldErrorDto } from '@vfortin/contact-contracts';

/**
 * Constant CONTRACT_FIELDS
 * @readonly
 *
 * @description
 * Maps domain property names to their public contract names when they differ.
 *
 * @type {Readonly<Record<string, string>>}
 */
const CONTRACT_FIELDS: Readonly<Record<string, string>> = { body: 'message' };

/**
 * Constant contactProblemMapper
 * @readonly
 *
 * @description
 * Maps contact domain and application failures to 422, 429, 404 or 412 problem details while leaving unknown errors unmapped.
 *
 * @type {ProblemMapper}
 */
export const contactProblemMapper: ProblemMapper = (exception) => {
  if (exception instanceof VersionMismatchError) {
    return {
      status: HttpStatus.PRECONDITION_FAILED,
      code: exception.code,
      title: exception.message,
    };
  }
  if (exception instanceof NotFoundError) {
    return { status: HttpStatus.NOT_FOUND, code: exception.code, title: exception.message };
  }
  if (exception instanceof RateLimitedError) {
    return {
      status: HttpStatus.TOO_MANY_REQUESTS,
      code: exception.code,
      title: exception.message,
    };
  }
  if (exception instanceof DomainError) {
    const errors: FieldErrorDto[] = exception.details.map((field) => ({
      field: CONTRACT_FIELDS[field] ?? field,
      message: exception.message,
    }));
    return {
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      code: exception.code,
      title: exception.message,
      errors,
    };
  }
  return null;
};
