import type { SeoSourceErrorCode } from '@internal/content-application/lib/ports/seo-dashboard/seo-dashboard.ports';

/**
 * Class ApplicationError
 * @class ApplicationError
 *
 * @description
 * Carries a stable application error code for failures that controllers map to HTTP responses.
 */
export class ApplicationError extends Error {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates an application rejection with its transport-neutral code and message.
   *
   * @param {string} code - Stable identifier used by the problem mapper.
   * @param {string} message - Human-readable failure detail.
   */
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
  // #endregion
}

/**
 * Class NotFoundError
 * @class NotFoundError
 *
 * @description
 * Identifies a requested content resource that the repository could not find.
 */
export class NotFoundError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Builds the stable not-found error for the requested resource kind.
   *
   * @param {string} what - Resource name included in the error message.
   */
  public constructor(what: string) {
    super('content.not-found', `${what} not found.`);
    this.name = 'NotFoundError';
  }
  // #endregion
}

/**
 * Class VersionMismatchError
 * @class VersionMismatchError
 *
 * @description
 * Signals that optimistic locking rejected a write because the stored project version changed.
 */
export class VersionMismatchError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates the version-conflict error instructing the editor to reload before retrying.
   *
   * @param {string} message - What changed in the meantime; the project by default.
   */
  public constructor(message: string = 'The project was modified in the meantime; reload it.') {
    super('content.version-mismatch', message);
    this.name = 'VersionMismatchError';
  }
  // #endregion
}

/** Rejects the retired manual publication workflow; publication is now automatic. */
export class ManualPublicationDisabledError extends ApplicationError {
  public constructor() {
    super(
      'content.manual-publication-disabled',
      'Publication is automatic; manual batches are no longer supported.',
    );
    this.name = 'ManualPublicationDisabledError';
  }
}

/**
 * Class MediaMissingError
 * @class MediaMissingError
 *
 * @description
 * Signals an upload without exactly one non-empty file in its `file` field.
 */
export class MediaMissingError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates the missing-file error of a media upload.
   *
   * @param {string} message - Detail of the malformed upload.
   */
  public constructor(message: string = 'Send one image in the "file" field.') {
    super('content.media-missing', message);
    this.name = 'MediaMissingError';
  }
  // #endregion
}

/**
 * Class MediaTooLargeError
 * @class MediaTooLargeError
 *
 * @description
 * Signals an upload or a request body larger than its limit.
 */
export class MediaTooLargeError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates the size-limit error.
   *
   * @param {string} message - Limit that was exceeded.
   */
  public constructor(message: string = 'The image exceeds 10 MiB.') {
    super('content.media-too-large', message);
    this.name = 'MediaTooLargeError';
  }
  // #endregion
}

/**
 * Class UnsupportedMediaError
 * @class UnsupportedMediaError
 *
 * @description
 * Signals uploaded bytes that are not a JPEG, PNG, WebP, AVIF or GIF image within the pixel limit.
 */
export class UnsupportedMediaError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates the unsupported-format error.
   *
   * @param {string} message - Reason the image was refused.
   */
  public constructor(message: string = 'Send a JPEG, PNG, WebP, AVIF or GIF image.') {
    super('content.media-unsupported', message);
    this.name = 'UnsupportedMediaError';
  }
  // #endregion
}

/**
 * Class MediaUnreachableError
 * @class MediaUnreachableError
 *
 * @description
 * Signals an image URL that could not be downloaded (D54): not `https` on port 443, a private
 * address, a status other than 200, more than three redirects, too large or too slow.
 */
export class MediaUnreachableError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates the download failure, with the transport's reason.
   *
   * @param {string} reason - Why the download failed, safe to show (no internal address).
   */
  public constructor(reason: string) {
    super(
      'content.media-unreachable',
      `The image could not be downloaded: ${reason} Use a public https URL of the image file itself.`,
    );
    this.name = 'MediaUnreachableError';
  }
  // #endregion
}

/**
 * Class MediaNotFoundError
 * @class MediaNotFoundError
 *
 * @description
 * Signals a revision referencing media that do not exist; `details` lists their identifiers.
 */
export class MediaNotFoundError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates the unknown-media error of a revision.
   *
   * @param {readonly string[]} details - Identifiers of the unknown media.
   */
  public constructor(public readonly details: readonly string[]) {
    super('content.media-not-found', 'The project references unknown media.');
    this.name = 'MediaNotFoundError';
  }
  // #endregion
}

/**
 * Class SeoSourceError
 * @class SeoSourceError
 *
 * @description
 * Failure of a Google source of the SEO dashboard (D47). Adapters throw it with a message free of
 * tokens and keys; the refresh stores it in the cache rather than answering it over HTTP.
 */
export class SeoSourceError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates the failure with its stable reason.
   *
   * @param {SeoSourceErrorCode} reason - Reason shown to the owner.
   * @param {string} message - English detail without credentials.
   */
  public constructor(
    public readonly reason: SeoSourceErrorCode,
    message: string,
  ) {
    super('content.seo-source-failed', message);
    this.name = 'SeoSourceError';
  }
  // #endregion
}

/**
 * Class SeoRefreshTooSoonError
 * @class SeoRefreshTooSoonError
 *
 * @description
 * Refuses a dashboard refresh requested less than `SEO_REFRESH_INTERVAL_MS` after the previous one
 * started.
 */
export class SeoRefreshTooSoonError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates the refusal with the time from which a refresh is accepted again.
   *
   * @param {Date} retryAt - Earliest time of the next refresh.
   */
  public constructor(public readonly retryAt: Date) {
    super(
      'content.seo-refresh-too-soon',
      'The SEO dashboard was refreshed less than 10 minutes ago; retry later.',
    );
    this.name = 'SeoRefreshTooSoonError';
  }
  // #endregion
}
