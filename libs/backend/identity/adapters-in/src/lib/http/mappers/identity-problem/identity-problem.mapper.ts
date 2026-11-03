import { HttpStatus } from '@nestjs/common';
import type { ProblemMapper } from '@vfortin/backend-http';
import {
  AlreadyBootstrappedError,
  ChallengeExpiredError,
  InvalidCredentialsError,
  InvalidSessionError,
} from '@vfortin/identity-application';
import { IDENTITY_ERROR_CODES } from '@vfortin/identity-contracts';
import { AccountLockedError, DomainError } from '@vfortin/identity-domain';

/**
 * Constant identityProblemMapper
 *
 * @description
 * Maps identity use-case and domain errors to HTTP problem details. Lockout shares the invalid-credentials response so account existence is not disclosed; unrelated errors return `null` for another mapper.
 *
 * @type {ProblemMapper}
 */
export const identityProblemMapper: ProblemMapper = (
  exception: unknown,
): { status: HttpStatus; code: string; title: string } | null => {
  if (exception instanceof InvalidCredentialsError || exception instanceof AccountLockedError) {
    return {
      status: HttpStatus.UNAUTHORIZED,
      code: IDENTITY_ERROR_CODES.invalidCredentials,
      title: new InvalidCredentialsError().message,
    };
  }
  if (exception instanceof InvalidSessionError) {
    return { status: HttpStatus.UNAUTHORIZED, code: exception.code, title: exception.message };
  }
  if (exception instanceof ChallengeExpiredError) {
    return {
      status: HttpStatus.UNAUTHORIZED,
      code: IDENTITY_ERROR_CODES.challengeExpired,
      title: exception.message,
    };
  }
  if (exception instanceof AlreadyBootstrappedError) {
    return { status: HttpStatus.CONFLICT, code: exception.code, title: exception.message };
  }
  if (exception instanceof DomainError) {
    return {
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      code: exception.code,
      title: exception.message,
    };
  }
  return null;
};
