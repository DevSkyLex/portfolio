import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import { AdminOnly } from '@vfortin/backend-auth';
import { IfMatchVersion, ZodValidationPipe, versionEtag } from '@vfortin/backend-http';
import {
  type AdminFaqView,
  CreateFaqEntry,
  DeleteFaqEntry,
  type FaqEntryChangeResult,
  GetAdminFaqEntry,
  ListAdminFaq,
  ReorderFaq,
  ReviseFaqEntry,
} from '@vfortin/content-application';
import {
  type AdminFaqEntryDto,
  type AdminFaqList,
  type FaqEntryRequest,
  FaqEntryRequestSchema,
  type FaqOrderRequest,
  FaqOrderRequestSchema,
} from '@vfortin/content-contracts';
import type { FaqEntry } from '@vfortin/content-domain';
import type { Response } from 'express';
import {
  toAdminFaqEntryDto,
  toAdminFaqList,
  toFaqEntryDraft,
} from '@internal/content-adapters-in/lib/http/presenters/admin-faq/admin-faq.presenter';

/**
 * Class AdminFaqController
 * @class AdminFaqController
 *
 * @description
 * Administration of the FAQ questions under `/api/content/admin/faq`, as the timeline: entry writes
 * take the entry version in `If-Match`; a reorder takes the list version, the `ETag` of the list and
 * of the reorder and delete answers. Every write advances the public content revision. `@AdminOnly`
 * runs before the body pipes, so an anonymous call is answered 401 whatever it sends.
 */
@Controller('content/admin/faq')
@AdminOnly()
export class AdminFaqController {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects the FAQ query and command use cases.
   *
   * @param {ListAdminFaq} listFaq - Lists the questions.
   * @param {GetAdminFaqEntry} getEntry - Loads a question.
   * @param {CreateFaqEntry} createEntry - Adds a question.
   * @param {ReviseFaqEntry} reviseEntry - Edits a question.
   * @param {DeleteFaqEntry} deleteEntry - Deletes a question.
   * @param {ReorderFaq} reorderFaq - Orders the questions.
   */
  public constructor(
    @Inject(ListAdminFaq) private readonly listFaq: ListAdminFaq,
    @Inject(GetAdminFaqEntry) private readonly getEntry: GetAdminFaqEntry,
    @Inject(CreateFaqEntry) private readonly createEntry: CreateFaqEntry,
    @Inject(ReviseFaqEntry) private readonly reviseEntry: ReviseFaqEntry,
    @Inject(DeleteFaqEntry) private readonly deleteEntry: DeleteFaqEntry,
    @Inject(ReorderFaq) private readonly reorderFaq: ReorderFaq,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Returns the questions by position, with the list version as `ETag`.
   *
   * @param {Response} response - Response receiving the `ETag`.
   * @returns {Promise<AdminFaqList>} FAQ list.
   */
  @Get('entries')
  @Header('Cache-Control', 'no-store')
  public async list(@Res({ passthrough: true }) response: Response): Promise<AdminFaqList> {
    return this.respondList(response, await this.listFaq.execute());
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Adds a question at the end of the list and answers 201 with its version as `ETag`.
   *
   * @param {FaqEntryRequest} body - Contract-validated content.
   * @param {Response} response - Response receiving the `ETag`.
   * @returns {Promise<AdminFaqEntryDto>} Created entry.
   */
  @Post('entries')
  @HttpCode(HttpStatus.CREATED)
  public async create(
    @Body(new ZodValidationPipe(FaqEntryRequestSchema)) body: FaqEntryRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminFaqEntryDto> {
    return this.respondEntry(response, await this.createEntry.execute(toFaqEntryDraft(body)));
  }

  /**
   * Method reorder
   * @method reorder
   *
   * @description
   * Orders the questions as `ids` lists them, if the list still has the `If-Match` version.
   *
   * @param {number} expectedVersion - List version parsed from `If-Match`.
   * @param {FaqOrderRequest} body - Every entry identifier.
   * @param {Response} response - Response receiving the new list `ETag`.
   * @returns {Promise<AdminFaqList>} Reordered list.
   */
  @Put('order')
  public async reorder(
    @IfMatchVersion() expectedVersion: number,
    @Body(new ZodValidationPipe(FaqOrderRequestSchema)) body: FaqOrderRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminFaqList> {
    return this.respondList(response, await this.reorderFaq.execute(expectedVersion, body.ids));
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Loads a question with its version as `ETag`.
   *
   * @param {string} id - Entry identifier.
   * @param {Response} response - Response receiving the `ETag`.
   * @returns {Promise<AdminFaqEntryDto>} Entry.
   */
  @Get('entries/:id')
  @Header('Cache-Control', 'no-store')
  public async get(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminFaqEntryDto> {
    const entry: FaqEntry = await this.getEntry.execute(id);
    response.setHeader('ETag', versionEtag(entry.version));
    return toAdminFaqEntryDto(entry);
  }

  /**
   * Method revise
   * @method revise
   *
   * @description
   * Replaces the content of a question if it still has the `If-Match` version.
   *
   * @param {string} id - Entry identifier.
   * @param {number} expectedVersion - Entry version parsed from `If-Match`.
   * @param {FaqEntryRequest} body - Contract-validated content.
   * @param {Response} response - Response receiving the new `ETag`.
   * @returns {Promise<AdminFaqEntryDto>} Revised entry.
   */
  @Put('entries/:id')
  public async revise(
    @Param('id') id: string,
    @IfMatchVersion() expectedVersion: number,
    @Body(new ZodValidationPipe(FaqEntryRequestSchema)) body: FaqEntryRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminFaqEntryDto> {
    return this.respondEntry(
      response,
      await this.reviseEntry.execute(id, expectedVersion, toFaqEntryDraft(body)),
    );
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Deletes a question if it still has the `If-Match` version and answers the remaining list with its
   * new version as `ETag`.
   *
   * @param {string} id - Entry identifier.
   * @param {number} expectedVersion - Entry version parsed from `If-Match`.
   * @param {Response} response - Response receiving the list `ETag`.
   * @returns {Promise<AdminFaqList>} Remaining list.
   */
  @Delete('entries/:id')
  public async remove(
    @Param('id') id: string,
    @IfMatchVersion() expectedVersion: number,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminFaqList> {
    return this.respondList(response, await this.deleteEntry.execute(id, expectedVersion));
  }

  /**
   * Method respondList
   * @method respondList
   *
   * @description
   * Sets the list version `ETag` and presents the list.
   *
   * @param {Response} response - Response to update.
   * @param {AdminFaqView} view - Entries and list version.
   * @returns {AdminFaqList} Administration list.
   */
  private respondList(response: Response, view: AdminFaqView): AdminFaqList {
    response.setHeader('ETag', versionEtag(view.version));
    return toAdminFaqList(view);
  }

  /**
   * Method respondEntry
   * @method respondEntry
   *
   * @description
   * Sets the entry version `ETag` and presents the entry.
   *
   * @param {Response} response - Response to update.
   * @param {FaqEntryChangeResult} result - Written entry and version.
   * @returns {AdminFaqEntryDto} Administration entry.
   */
  private respondEntry(response: Response, result: FaqEntryChangeResult): AdminFaqEntryDto {
    response.setHeader('ETag', versionEtag(result.version));
    return toAdminFaqEntryDto(result.entry, result.version);
  }
  // #endregion
}
