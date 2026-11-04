import {
  BadRequestException,
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaMissingError, MediaTooLargeError } from '@vfortin/content-application';
import { MEDIA_UPLOAD_LIMITS } from '@vfortin/content-contracts';
import type { Observable } from 'rxjs';

/**
 * Class MediaUploadInterceptor
 * @class MediaUploadInterceptor
 *
 * @description
 * Reads the multipart upload into memory with Multer (D40): one part, the file field only, at most
 * `MEDIA_UPLOAD_LIMITS.bytes`. Multer stops reading at the first limit; its errors become the media
 * problems (`content.media-too-large`, `content.media-missing`). Guards run before interceptors, so
 * `@AdminOnly` rejects an anonymous upload before a byte of it is parsed.
 */
@Injectable()
export class MediaUploadInterceptor implements NestInterceptor {
  // #region Properties
  /**
   * Property files
   * @readonly
   *
   * @description
   * Nest Multer interceptor with memory storage and no file filter: the image processor decides
   * what an image is, not the client-declared type.
   */
  private readonly files: NestInterceptor = new (FileInterceptor(MEDIA_UPLOAD_LIMITS.field, {
    limits: { fileSize: MEDIA_UPLOAD_LIMITS.bytes, files: 1, fields: 0, parts: 1 },
  }))();
  // #endregion

  // #region Methods
  /**
   * Method intercept
   * @method intercept
   *
   * @description
   * Parses the upload, then hands over to the route.
   *
   * @param {ExecutionContext} context - Request context.
   * @param {CallHandler} next - Route handler.
   * @throws {MediaTooLargeError} When the file exceeds the size limit.
   * @throws {MediaMissingError} When the multipart body has other fields, files or parts.
   * @returns {Promise<Observable<unknown>>} Route result.
   */
  public async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    try {
      return await (this.files.intercept(context, next) as Promise<Observable<unknown>>);
    } catch (error: unknown) {
      if (error instanceof PayloadTooLargeException) {
        throw new MediaTooLargeError();
      }
      if (error instanceof BadRequestException) {
        throw new MediaMissingError(`Send one image in the "file" field (${error.message}).`);
      }
      throw error;
    }
  }
  // #endregion
}
