import type { AuthorizationParameters } from '@vfortin/identity-application';
import type { AuthorizationReviewRequest } from '@vfortin/identity-contracts';
import { OAuthError } from '@vfortin/identity-domain';

/**
 * Type ProtocolValue
 * @type ProtocolValue
 *
 * @description
 * One parsed protocol parameter: absent, a value, or several values when it was repeated.
 */
export type ProtocolValue = string | readonly string[] | undefined;

/**
 * Function optionalParameter
 *
 * @description
 * Reads a parameter that must appear at most once; an empty value counts as absent (RFC 6749 §3.1).
 *
 * @param {ProtocolValue} value - Parsed parameter.
 * @param {string} name - Parameter name, for the error description.
 *
 * @returns {string | null} Its value, or `null`.
 *
 * @throws {OAuthError} `invalid_request` when the parameter is repeated.
 */
export function optionalParameter(value: ProtocolValue, name: string): string | null {
  if (Array.isArray(value)) {
    throw new OAuthError('invalid_request', `The ${name} parameter must not be repeated.`);
  }
  return typeof value === 'string' && value !== '' ? value : null;
}

/**
 * Function requiredParameter
 *
 * @description
 * Reads a parameter that must appear exactly once.
 *
 * @param {ProtocolValue} value - Parsed parameter.
 * @param {string} name - Parameter name, for the error description.
 *
 * @returns {string} Its value.
 *
 * @throws {OAuthError} `invalid_request` when the parameter is missing or repeated.
 */
export function requiredParameter(value: ProtocolValue, name: string): string {
  const single: string | null = optionalParameter(value, name);
  if (single === null) {
    throw new OAuthError('invalid_request', `The ${name} parameter is required.`);
  }
  return single;
}

/**
 * Function toAuthorizationParameters
 *
 * @description
 * Maps the forwarded authorization query to the use-case parameters, recording the repeated ones
 * instead of failing, so that the use case decides whether the refusal can be redirected.
 *
 * @param {AuthorizationReviewRequest} request - Validated body.
 *
 * @returns {AuthorizationParameters} Use-case parameters.
 */
export function toAuthorizationParameters(
  request: AuthorizationReviewRequest,
): AuthorizationParameters {
  const repeated: string[] = [];
  const read: (value: ProtocolValue, name: string) => string | null = (
    value: ProtocolValue,
    name: string,
  ): string | null => {
    if (Array.isArray(value)) {
      repeated.push(name);
      return null;
    }
    return typeof value === 'string' && value !== '' ? value : null;
  };
  return {
    responseType: read(request.response_type, 'response_type'),
    clientId: read(request.client_id, 'client_id'),
    redirectUri: read(request.redirect_uri, 'redirect_uri'),
    scope: read(request.scope, 'scope'),
    state: read(request.state, 'state'),
    codeChallenge: read(request.code_challenge, 'code_challenge'),
    codeChallengeMethod: read(request.code_challenge_method, 'code_challenge_method'),
    resource: read(request.resource, 'resource'),
    repeated,
  };
}
