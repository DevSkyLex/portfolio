import {
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AdminOnly } from '@vfortin/backend-auth';
import { MediaMissingError, type MediaRecord, UploadMedia } from '@vfortin/content-application';
import type { MediaDto } from '@vfortin/content-contracts';
import { MediaUploadInterceptor } from '@internal/content-adapters-in/lib/http/interceptors/media-upload/media-upload.interceptor';
import { toMediaDto } from '@internal/content-adapters-in/lib/http/presenters/media/media.presenter';

/**
 * Interface UploadedMediaFile
 * @interface UploadedMediaFile
 *
 * @description
 * Part of the Multer file the route reads: the bytes held by the memory storage.
 */
interface UploadedMediaFile {
  // #region Properties
  readonly buffer: Buffer;
  // #endregion
}

/**
 * Class AdminMediaController
 * @class AdminMediaController
 *
 * @description
 * Receives the images of the article editor and of the project cover (D40). `@AdminOnly` runs before
 * the upload interceptor, so an anonymous request is refused before its body is read.
 */
@Controller('content/admin/media')
@AdminOnly()
export class AdminMediaController {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects the upload use case.
   *
   * @param {UploadMedia} uploadMedia - Re-encodes and stores an image.
   */
  public constructor(@Inject(UploadMedia) private readonly uploadMedia: UploadMedia) {}
  // #endregion

  // #region Methods
  /**
   * Method upload
   * @method upload
   *
   * @description
   * Stores the image of the multipart field `file` and returns it (201); the same bytes sent again
   * return the media already stored.
   *
   * @param {UploadedMediaFile | undefined} file - File read by the upload interceptor.
   * @throws {MediaMissingError} When the request carries no file.
   * @returns {Promise<MediaDto>} Stored media.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  @UseInterceptors(MediaUploadInterceptor)
  public async upload(@UploadedFile() file: UploadedMediaFile | undefined): Promise<MediaDto> {
    if (file === undefined) {
      throw new MediaMissingError();
    }
    const record: MediaRecord = await this.uploadMedia.execute(file.buffer);
    return toMediaDto(record);
  }
  // #endregion
}
