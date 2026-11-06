import { HttpStatus } from '@nestjs/common';
import type { ProblemMapper } from '@vfortin/backend-http';
import {
  MediaMissingError,
  ManualPublicationDisabledError,
  MediaNotFoundError,
  MediaTooLargeError,
  MediaUnreachableError,
  NotFoundError,
  SeoRefreshTooSoonError,
  UnsupportedMediaError,
  VersionMismatchError,
} from '@vfortin/content-application';
import { DomainError } from '@vfortin/content-domain';

/**
 * Constant FIELD_ERROR_CODES
 *
 * @description
 * Domain codes whose `details` are contract field paths (`title.en`, `end`, `ids`,
 * `facts.0.label.en`, `body.en`): their problem
 * also carries `errors` per field, like a 400 `request.invalid`, so the admin forms attach them.
 */
const FIELD_ERROR_CODES: ReadonlySet<string> = new Set<string>([
  'content.invalid-value',
  'content.timeline-entry-incomplete',
  'content.timeline-order-invalid',
  'content.profile-incomplete',
  'content.legal-document-incomplete',
]);

/**
 * Constant contentProblemMapper
 *
 * @description
 * Maps content domain and application failures to their HTTP problem statuses, the media codes of
 * `MEDIA_ERROR_CODES` included; unrelated errors return `null` so the shared exception filter can
 * handle them (an oversized JSON body there becomes `http.413`, like the Nginx limit). Field-level
 * domain failures (`FIELD_ERROR_CODES`) add `errors` beside their `details`.
 */
export const contentProblemMapper: ProblemMapper = (
  exception: unknown,
): ReturnType<ProblemMapper> => {
  if (exception instanceof ManualPublicationDisabledError) {
    return { status: HttpStatus.GONE, code: exception.code, title: exception.message };
  }
  if (exception instanceof VersionMismatchError) {
    return {
      status: HttpStatus.PRECONDITION_FAILED,
      code: exception.code,
      title: exception.message,
    };
  }
  if (exception instanceof SeoRefreshTooSoonError) {
    // The controller has set `Retry-After`; `details` carries the same time in ISO form.
    return {
      status: HttpStatus.TOO_MANY_REQUESTS,
      code: exception.code,
      title: exception.message,
      details: [exception.retryAt.toISOString()],
    };
  }
  if (exception instanceof NotFoundError) {
    return { status: HttpStatus.NOT_FOUND, code: exception.code, title: exception.message };
  }
  if (exception instanceof MediaMissingError) {
    return { status: HttpStatus.BAD_REQUEST, code: exception.code, title: exception.message };
  }
  if (exception instanceof MediaTooLargeError) {
    return { status: HttpStatus.PAYLOAD_TOO_LARGE, code: exception.code, title: exception.message };
  }
  if (exception instanceof MediaUnreachableError) {
    return {
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      code: exception.code,
      title: exception.message,
    };
  }
  if (exception instanceof UnsupportedMediaError) {
    return {
      status: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      code: exception.code,
      title: exception.message,
    };
  }
  if (exception instanceof MediaNotFoundError || exception instanceof DomainError) {
    return {
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      code: exception.code,
      title: exception.message,
      details: exception.details,
      ...(FIELD_ERROR_CODES.has(exception.code)
        ? {
            errors: exception.details.map((field: string): { field: string; message: string } => ({
              field,
              message: exception.message,
            })),
          }
        : {}),
    };
  }
  return null;
};
