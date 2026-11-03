import { HttpStatus } from '@nestjs/common';
import type { ProblemMapper } from '@vfortin/backend-http';
import { NotFoundError, VersionMismatchError } from '@vfortin/content-application';
import { DomainError } from '@vfortin/content-domain';

/**
 * Constant contentProblemMapper
 *
 * @description
 * Maps content domain and application failures to their HTTP problem statuses; unrelated errors
 * return `null` so the shared exception filter can handle them.
 */
export const contentProblemMapper: ProblemMapper = (
  exception: unknown,
): ReturnType<ProblemMapper> => {
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
  if (exception instanceof DomainError) {
    return {
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      code: exception.code,
      title: exception.message,
      details: exception.details,
    };
  }
  return null;
};
