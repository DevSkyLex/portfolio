import { Controller, Get, Header, Inject, Query } from '@nestjs/common';
import { ZodValidationPipe } from '@vfortin/backend-http';
import { GetPublishedContent } from '@vfortin/content-application';
import {
  type ContentSnapshot,
  type ContentSnapshotQuery,
  ContentSnapshotQuerySchema,
} from '@vfortin/content-contracts';
import { toContentSnapshot } from '@internal/content-adapters-in/lib/http/presenters/content/content.presenter';

/**
 * Class ContentController
 * @class ContentController
 *
 * @description
 * Exposes the published content snapshot used by the static-site prerender request.
 */
@Controller('content')
export class ContentController {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects the application use case that reads published content consistently.
   *
   * @param {GetPublishedContent} getPublishedContent - Published snapshot query.
   */
  public constructor(
    @Inject(GetPublishedContent) private readonly getPublishedContent: GetPublishedContent,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method snapshot
   * @method snapshot
   *
   * @description
   * Returns all published content in the validated query locale for the prerendering site build.
   *
   * @param {ContentSnapshotQuery} query - Locale query parsed by the Zod validation pipe.
   * @returns {Promise<ContentSnapshot>} Locale-specific public content DTO.
   */
  @Get('snapshot')
  @Header('Cache-Control', 'no-store')
  public async snapshot(
    @Query(new ZodValidationPipe(ContentSnapshotQuerySchema)) query: ContentSnapshotQuery,
  ): Promise<ContentSnapshot> {
    return toContentSnapshot(await this.getPublishedContent.execute(), query.locale);
  }
  // #endregion
}
