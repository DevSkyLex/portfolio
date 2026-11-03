import {
  HttpException,
  HttpStatus,
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';

/**
 * Function versionEtag
 *
 * @description
 * Formats a resource version as the quoted entity tag expected by `If-Match` clients.
 *
 * @param {number} version - Non-negative resource version assigned by the owning context.
 * @returns {string} Strong entity tag containing the decimal version.
 */
export function versionEtag(version: number): string {
  return `"${version}"`;
}

/**
 * Function parseIfMatch
 *
 * @description
 * Parses a quoted strong or weak version from `If-Match`; values outside the supported format produce HTTP 428.
 *
 * @param {string | undefined} header - Raw request header value, if present.
 * @returns {number} Parsed integer version used for optimistic concurrency checks.
 * @throws {HttpException} When the header is missing or does not contain a supported quoted version.
 */
export function parseIfMatch(header: string | undefined): number {
  const match: RegExpExecArray | null = /^(?:W\/)?"(\d{1,9})"$/.exec(header?.trim() ?? '');
  if (!match?.[1]) {
    throw new HttpException(
      {
        code: 'request.precondition-required',
        message: 'If-Match header required (the version read before editing).',
      },
      HttpStatus.PRECONDITION_REQUIRED,
    );
  }
  return Number(match[1]);
}

/**
 * Constant IfMatchVersion
 *
 * @description
 * Nest route parameter decorator that injects the parsed expected version from the request's `If-Match` header.
 *
 * @returns {(...dataOrPipes: unknown[]) => ParameterDecorator} Factory that creates the parameter decorator, optionally with Nest pipes.
 */
export const IfMatchVersion: (...dataOrPipes: unknown[]) => ParameterDecorator =
  createParamDecorator((_data: unknown, context: ExecutionContext): number =>
    parseIfMatch(
      context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>().headers[
        'if-match'
      ],
    ),
  );
