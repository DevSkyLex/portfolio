import { SeoSourceError, type SeoSourceErrorCode } from '@vfortin/content-application';

/**
 * Interface GoogleRequestOptions
 * @interface GoogleRequestOptions
 *
 * @description
 * How one Google REST call is made and reported.
 */
export interface GoogleRequestOptions {
  // #region Properties
  /**
   * Property service
   * @readonly
   *
   * @description
   * Service name used in failure messages (`Search Console`, `Google Analytics`…).
   */
  readonly service: string;

  /**
   * Property fetcher
   * @readonly
   *
   * @description
   * HTTP implementation; tests point it at a local server.
   */
  readonly fetcher: typeof fetch;

  /**
   * Property timeoutMs
   * @readonly
   *
   * @description
   * Longest wait for the whole response, body included.
   */
  readonly timeoutMs: number;

  /**
   * Property secrets
   * @readonly
   *
   * @description
   * Values that must never appear in a failure message (access token, API key).
   */
  readonly secrets: readonly string[];
  // #endregion
}

/**
 * Constant MESSAGE_LIMIT
 *
 * @description
 * Longest stored failure message, the contract bound.
 */
const MESSAGE_LIMIT: number = 300;

/**
 * Function redact
 *
 * @description
 * Removes the supplied secrets and anything shaped like a Google credential (OAuth access token,
 * API key, bearer header, `key=` parameter) from a text, then bounds its length.
 *
 * @param {string} text - Text to clean.
 * @param {readonly string[]} secrets - Exact values to remove.
 * @returns {string} Text safe to store and show.
 */
export function redact(text: string, secrets: readonly string[]): string {
  let clean: string = text;
  for (const secret of secrets) {
    if (secret !== '') clean = clean.split(secret).join('[redacted]');
  }
  clean = clean
    .replace(/ya29\.[\w.-]+/g, '[redacted]')
    .replace(/AIza[\w-]{20,}/g, '[redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[redacted]')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > MESSAGE_LIMIT ? `${clean.slice(0, MESSAGE_LIMIT - 1)}…` : clean;
}

/**
 * Function reasonOf
 *
 * @description
 * Maps a Google HTTP status and its error status to a failure reason. A refused API key answers 400
 * (`API_KEY_INVALID`), a disabled API or a missing permission 403.
 *
 * @param {number} status - HTTP status.
 * @param {string} body - Response body.
 * @returns {SeoSourceErrorCode} Reason.
 */
function reasonOf(status: number, body: string): SeoSourceErrorCode {
  if (status === 401 || /API_KEY_INVALID|API key not valid/.test(body))
    return 'credentials-rejected';
  if (status === 403) return 'permission-denied';
  if (status === 404) return 'not-found';
  if (status === 429) return 'quota-exceeded';
  if (status >= 500) return 'upstream';
  if (status === 400) return 'bad-request';
  return 'unexpected';
}

/**
 * Function googleError
 *
 * @description
 * Reads the `{ error: { status, message } }` body of a Google failure.
 *
 * @param {string} body - Response body.
 * @returns {{ status: string | null; message: string | null }} Google status and message.
 */
function googleError(body: string): { status: string | null; message: string | null } {
  try {
    const parsed: unknown = JSON.parse(body);
    const error: unknown =
      parsed !== null && typeof parsed === 'object' && 'error' in parsed ? parsed.error : null;
    if (error === null || typeof error !== 'object') return { status: null, message: null };
    const status: unknown = 'status' in error ? error.status : null;
    const message: unknown = 'message' in error ? error.message : null;
    return {
      status: typeof status === 'string' ? status : null,
      message: typeof message === 'string' ? message : null,
    };
  } catch {
    return { status: null, message: null };
  }
}

/**
 * Function isTimeout
 *
 * @description
 * Recognizes the rejection of `AbortSignal.timeout`.
 *
 * @param {unknown} error - Rejection of `fetch` or of the body read.
 * @returns {boolean} Whether the request timed out.
 */
function isTimeout(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  );
}

/**
 * Function googleJson
 *
 * @description
 * Sends one request to a Google REST API and parses its JSON answer. Every failure becomes a
 * `SeoSourceError` whose message names the service, the HTTP and Google statuses and Google's own
 * message, redacted: never the token or the key.
 *
 * @param {string} url - Absolute request URL.
 * @param {RequestInit} init - Method, headers and body.
 * @param {GoogleRequestOptions} options - Service, transport, timeout and secrets.
 * @throws {SeoSourceError} On a timeout, a network failure, a non-2xx status or invalid JSON.
 * @returns {Promise<unknown>} Parsed body.
 */
export async function googleJson(
  url: string,
  init: RequestInit,
  options: GoogleRequestOptions,
): Promise<unknown> {
  let status: number;
  let body: string;
  try {
    const response: Response = await options.fetcher(url, {
      ...init,
      signal: AbortSignal.timeout(options.timeoutMs),
    });
    status = response.status;
    body = await response.text();
  } catch (error: unknown) {
    if (isTimeout(error)) {
      throw new SeoSourceError(
        'timeout',
        `${options.service} did not answer within ${Math.ceil(options.timeoutMs / 1000)} s.`,
      );
    }
    throw new SeoSourceError('network', `${options.service} could not be reached.`);
  }
  if (status < 200 || status > 299) {
    const google: { status: string | null; message: string | null } = googleError(body);
    const detail: string = [google.status, google.message].filter(Boolean).join(': ');
    throw new SeoSourceError(
      reasonOf(status, body),
      redact(
        `${options.service} refused the request (HTTP ${status})${detail ? `: ${detail}` : '.'}`,
        options.secrets,
      ),
    );
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new SeoSourceError('invalid-response', `${options.service} answered with invalid JSON.`);
  }
}

/**
 * Function invalid
 *
 * @description
 * Builds the failure of an answer that does not have the documented shape.
 *
 * @param {string} service - Service name.
 * @param {string} what - Unexpected part.
 * @returns {SeoSourceError} Failure.
 */
export function invalid(service: string, what: string): SeoSourceError {
  return new SeoSourceError('invalid-response', `${service} answered an unexpected ${what}.`);
}

/**
 * Function field
 *
 * @description
 * Reads a property of an untrusted JSON object.
 *
 * @param {unknown} value - Parsed JSON value.
 * @param {string} key - Property name.
 * @returns {unknown} Property value, `undefined` when absent or when `value` is not an object.
 */
export function field(value: unknown, key: string): unknown {
  return value !== null && typeof value === 'object' && key in value
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

/**
 * Function list
 *
 * @description
 * Reads an optional array property (Google leaves `rows` out when there is no data).
 *
 * @param {unknown} value - Parsed JSON object.
 * @param {string} key - Property name.
 * @param {string} service - Service name for the failure.
 * @throws {SeoSourceError} When the property is present but not an array.
 * @returns {readonly unknown[]} Elements, empty when absent.
 */
export function list(value: unknown, key: string, service: string): readonly unknown[] {
  const items: unknown = field(value, key);
  if (items === undefined) return [];
  if (!Array.isArray(items)) throw invalid(service, key);
  return items;
}

/**
 * Function finite
 *
 * @description
 * Reads a finite, non-negative number, given as a number or as a numeric string (GA4 metric values).
 *
 * @param {unknown} value - Untrusted value.
 * @param {string} service - Service name for the failure.
 * @param {string} what - Value name for the failure.
 * @throws {SeoSourceError} When the value is not such a number.
 * @returns {number} Number.
 */
export function finite(value: unknown, service: string, what: string): number {
  const number: number =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(number) || number < 0) throw invalid(service, what);
  return number;
}

/**
 * Function round
 *
 * @description
 * Rounds a measure to a number of decimals, keeping the stored JSON compact.
 *
 * @param {number} value - Measure.
 * @param {number} decimals - Decimals kept.
 * @returns {number} Rounded measure.
 */
export function round(value: number, decimals: number): number {
  const factor: number = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
