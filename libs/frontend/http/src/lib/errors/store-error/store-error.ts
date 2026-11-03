import { HttpErrorResponse } from '@angular/common/http';

/**
 * Interface ServerFieldError
 * @interface ServerFieldError
 *
 * @description
 * Field-specific validation message extracted from a problem+json response.
 */
export interface ServerFieldError {
  // #region Properties
  /**
   * Property field
   * @readonly
   *
   * @description
   * Request field name associated with the validation message.
   *
   * @type {string}
   */
  readonly field: string;

  /**
   * Property message
   * @readonly
   *
   * @description
   * Localized validation message returned for the field.
   *
   * @type {string}
   */
  readonly message: string;
  // #endregion
}

/**
 * Interface StoreError
 * @interface StoreError
 *
 * @description
 * HTTP or unexpected failure reduced to safe display data and retry metadata for a store.
 */
export interface StoreError {
  // #region Properties
  /**
   * Property message
   * @readonly
   *
   * @description
   * Localized text suitable for presenting to the user.
   *
   * @type {string}
   */
  readonly message: string;

  /**
   * Property code
   * @readonly
   *
   * @description
   * Stable problem code when supplied by the API, or `null` for transport and unexpected failures.
   *
   * @type {string | null}
   */
  readonly code: string | null;

  /**
   * Property status
   * @readonly
   *
   * @description
   * HTTP status for an HTTP failure, or `null` when no HTTP response was received.
   *
   * @type {number | null}
   */
  readonly status: number | null;

  /**
   * Property fieldErrors
   * @readonly
   *
   * @description
   * Valid field messages parsed from the response body; malformed entries are omitted.
   *
   * @type {readonly ServerFieldError[]}
   */
  readonly fieldErrors: readonly ServerFieldError[];

  /**
   * Property retryable
   * @readonly
   *
   * @description
   * Whether the normalized status represents a network, rate-limit, or server failure.
   *
   * @type {boolean}
   */
  readonly retryable: boolean;
  // #endregion
}

/**
 * Function record
 *
 * @description
 * Narrows a non-array object to a readonly record before reading problem response fields.
 *
 * @param {unknown} value - Candidate value from an untrusted response body.
 *
 * @returns {Readonly<Record<string, unknown>> | null} Record view for an object, otherwise `null`.
 */
function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

/**
 * Function toServerFieldErrors
 *
 * @description
 * Extracts valid field/message pairs from the API's `errors` array and ignores malformed entries.
 *
 * @param {unknown} body - Untrusted problem response body.
 *
 * @returns {readonly ServerFieldError[]} Parsed field errors, or an empty list when the body has none.
 */
export function toServerFieldErrors(body: unknown): readonly ServerFieldError[] {
  const errors: unknown = record(body)?.['errors'];
  if (!Array.isArray(errors)) {
    return [];
  }
  return errors.flatMap((value: unknown): ServerFieldError[] => {
    const entry: Readonly<Record<string, unknown>> | null = record(value);
    const field: unknown = entry?.['field'];
    const message: unknown = entry?.['message'];
    return typeof field === 'string' && typeof message === 'string' ? [{ field, message }] : [];
  });
}

/**
 * Function toStoreError
 *
 * @description
 * Converts transport and HTTP failures to localized store state while retaining only the stable
 * problem code, status, and valid field errors from an HTTP response.
 *
 * @param {unknown} error - Rejected value caught by a store operation.
 *
 * @returns {StoreError} Display message and retry metadata for the failure.
 */
export function toStoreError(error: unknown): StoreError {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      message: $localize`:@@http.unexpected:Une erreur inattendue est survenue.`,
      code: null,
      status: null,
      fieldErrors: [],
      retryable: false,
    };
  }
  const code: unknown = record(error.error)?.['code'];
  const message: string =
    error.status === 0
      ? $localize`:@@http.offline:La connexion est indisponible. Vérifiez votre réseau, puis réessayez.`
      : error.status === 429
        ? $localize`:@@http.rateLimited:Trop de tentatives. Réessayez dans un moment.`
        : error.status >= 500
          ? $localize`:@@http.server:Le service ne répond pas. Réessayez dans un moment.`
          : $localize`:@@http.rejected:La demande a été refusée.`;
  return {
    message,
    code: typeof code === 'string' ? code : null,
    status: error.status,
    fieldErrors: toServerFieldErrors(error.error),
    retryable: error.status === 0 || error.status === 429 || error.status >= 500,
  };
}
