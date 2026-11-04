import { HttpStatus } from '@nestjs/common';
import type { ProblemMapper } from '@vfortin/backend-http';
import {
  AlreadyBootstrappedError,
  AuthorizationRequestExpiredError,
  ChallengeExpiredError,
  ConnectedApplicationNotFoundError,
  InvalidCredentialsError,
  InvalidSessionError,
  PasswordMismatchError,
  TotpInvalidError,
} from '@vfortin/identity-application';
import {
  IDENTITY_ERROR_CODES,
  OAUTH_PROBLEM_CODES,
  TWO_FACTOR_ERROR_CODES,
} from '@vfortin/identity-contracts';
import {
  AccountLockedError,
  DomainError,
  OAuthError,
  TwoFactorStateError,
} from '@vfortin/identity-domain';

/**
 * Constant identityProblemMapper
 *
 * @description
 * Maps identity use-case and domain errors to HTTP problem details. Lockout shares the invalid-credentials response so account existence is not disclosed; the second-factor refusals answer 422 or 409, never 401, so that the admin client keeps its session (D17). On the administrator OAuth routes (D45), an authorization request that cannot go back to its client answers 400 with its own code (never 401 either), a request no longer decidable or an unknown connected application 404. Unrelated errors return `null` for another mapper.
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
  if (exception instanceof PasswordMismatchError) {
    return {
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      code: TWO_FACTOR_ERROR_CODES.passwordMismatch,
      title: exception.message,
    };
  }
  if (exception instanceof TotpInvalidError) {
    return {
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      code: TWO_FACTOR_ERROR_CODES.totpInvalid,
      title: exception.message,
    };
  }
  if (exception instanceof TwoFactorStateError) {
    return {
      status: HttpStatus.CONFLICT,
      code: TWO_FACTOR_ERROR_CODES.totpState,
      title: exception.message,
    };
  }
  if (exception instanceof OAuthError) {
    const code: string =
      exception.error === 'invalid_client'
        ? OAUTH_PROBLEM_CODES.invalidClient
        : exception.error === 'invalid_redirect_uri'
          ? OAUTH_PROBLEM_CODES.invalidRedirectUri
          : OAUTH_PROBLEM_CODES.invalidRequest;
    return { status: HttpStatus.BAD_REQUEST, code, title: exception.description };
  }
  if (
    exception instanceof AuthorizationRequestExpiredError ||
    exception instanceof ConnectedApplicationNotFoundError
  ) {
    return { status: HttpStatus.NOT_FOUND, code: exception.code, title: exception.message };
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
