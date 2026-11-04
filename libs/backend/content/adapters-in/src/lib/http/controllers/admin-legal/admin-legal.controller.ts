import { Body, Controller, Get, Header, Inject, Param, Put, Res } from '@nestjs/common';
import { AdminOnly } from '@vfortin/backend-auth';
import { IfMatchVersion, ZodValidationPipe, versionEtag } from '@vfortin/backend-http';
import {
  GetAdminLegalDocument,
  type LegalDocumentChangeResult,
  ReviseLegalDocument,
} from '@vfortin/content-application';
import {
  type AdminLegalDocumentDto,
  type LegalDocumentKindDto,
  LegalDocumentKindSchema,
  type LegalDocumentRevisionRequest,
  LegalDocumentRevisionRequestSchema,
} from '@vfortin/content-contracts';
import type { LegalDocument } from '@vfortin/content-domain';
import type { Response } from 'express';
import { toAdminLegalDocumentDto } from '@internal/content-adapters-in/lib/http/presenters/admin-site-texts/admin-site-texts.presenter';

/**
 * Class AdminLegalController
 * @class AdminLegalController
 *
 * @description
 * Administration of the legal notice and the privacy policy (« Légal ») under
 * `/api/content/admin/legal/:kind`. A revision takes the document version in `If-Match`, dates the
 * save and queues a site rebuild. `@AdminOnly` runs before the body pipe, so an anonymous call is
 * answered 401 whatever it sends.
 */
@Controller('content/admin/legal/:kind')
@AdminOnly()
export class AdminLegalController {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects the legal document query and command.
   *
   * @param {GetAdminLegalDocument} getDocument - Loads a document.
   * @param {ReviseLegalDocument} reviseDocument - Revises a document.
   */
  public constructor(
    @Inject(GetAdminLegalDocument) private readonly getDocument: GetAdminLegalDocument,
    @Inject(ReviseLegalDocument) private readonly reviseDocument: ReviseLegalDocument,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method get
   * @method get
   *
   * @description
   * Returns the document with its version as `ETag`.
   *
   * @param {LegalDocumentKindDto} kind - Document from the route.
   * @param {Response} response - Response receiving the `ETag`.
   * @returns {Promise<AdminLegalDocumentDto>} Document.
   */
  @Get()
  @Header('Cache-Control', 'no-store')
  public async get(
    @Param('kind', new ZodValidationPipe(LegalDocumentKindSchema)) kind: LegalDocumentKindDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminLegalDocumentDto> {
    const document: LegalDocument = await this.getDocument.execute(kind);
    response.setHeader('ETag', versionEtag(document.version));
    return toAdminLegalDocumentDto(document);
  }

  /**
   * Method revise
   * @method revise
   *
   * @description
   * Replaces both languages of the document if it still has the `If-Match` version.
   *
   * @param {LegalDocumentKindDto} kind - Document from the route.
   * @param {number} expectedVersion - Version parsed from `If-Match`.
   * @param {LegalDocumentRevisionRequest} body - Contract-validated documents.
   * @param {Response} response - Response receiving the new `ETag`.
   * @returns {Promise<AdminLegalDocumentDto>} Revised document.
   */
  @Put()
  public async revise(
    @Param('kind', new ZodValidationPipe(LegalDocumentKindSchema)) kind: LegalDocumentKindDto,
    @IfMatchVersion() expectedVersion: number,
    @Body(new ZodValidationPipe(LegalDocumentRevisionRequestSchema))
    body: LegalDocumentRevisionRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminLegalDocumentDto> {
    const result: LegalDocumentChangeResult = await this.reviseDocument.execute(
      kind,
      expectedVersion,
      body.body,
    );
    response.setHeader('ETag', versionEtag(result.version));
    return toAdminLegalDocumentDto(result.document, result.version);
  }
  // #endregion
}
