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
  type AdminTimelineView,
  CreateTimelineEntry,
  DeleteTimelineEntry,
  GetAdminTimelineEntry,
  ListAdminTimeline,
  ReorderTimeline,
  ReviseTimelineEntry,
  type TimelineEntryChangeResult,
} from '@vfortin/content-application';
import {
  type AdminTimelineEntryDto,
  type AdminTimelineList,
  type TimelineEntryRequest,
  TimelineEntryRequestSchema,
  type TimelineKindDto,
  TimelineKindSchema,
  type TimelineOrderRequest,
  TimelineOrderRequestSchema,
} from '@vfortin/content-contracts';
import type { TimelineEntry } from '@vfortin/content-domain';
import type { Response } from 'express';
import {
  toAdminTimelineEntryDto,
  toAdminTimelineList,
  toTimelineEntryDraft,
} from '@internal/content-adapters-in/lib/http/presenters/admin-timeline/admin-timeline.presenter';

/**
 * Class AdminTimelineController
 * @class AdminTimelineController
 *
 * @description
 * Administration of the education and experience entries under
 * `/api/content/admin/timeline/:kind`. Entry writes take the entry version in `If-Match`; a reorder
 * takes the list version, the `ETag` of the list and of the reorder and delete answers. Every write
 * queues a site rebuild, since entries are always public. `@AdminOnly` runs before the body pipes,
 * so an anonymous call is answered 401 whatever it sends.
 */
@Controller('content/admin/timeline/:kind')
@AdminOnly()
export class AdminTimelineController {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects the timeline query and command use cases.
   *
   * @param {ListAdminTimeline} listTimeline - Lists a kind.
   * @param {GetAdminTimelineEntry} getEntry - Loads an entry.
   * @param {CreateTimelineEntry} createEntry - Adds an entry.
   * @param {ReviseTimelineEntry} reviseEntry - Edits an entry.
   * @param {DeleteTimelineEntry} deleteEntry - Deletes an entry.
   * @param {ReorderTimeline} reorderTimeline - Orders a kind.
   */
  public constructor(
    @Inject(ListAdminTimeline) private readonly listTimeline: ListAdminTimeline,
    @Inject(GetAdminTimelineEntry) private readonly getEntry: GetAdminTimelineEntry,
    @Inject(CreateTimelineEntry) private readonly createEntry: CreateTimelineEntry,
    @Inject(ReviseTimelineEntry) private readonly reviseEntry: ReviseTimelineEntry,
    @Inject(DeleteTimelineEntry) private readonly deleteEntry: DeleteTimelineEntry,
    @Inject(ReorderTimeline) private readonly reorderTimeline: ReorderTimeline,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Returns the entries of a kind by position, with the list version as `ETag`.
   *
   * @param {TimelineKindDto} kind - Kind from the route.
   * @param {Response} response - Response receiving the `ETag`.
   * @returns {Promise<AdminTimelineList>} List of the kind.
   */
  @Get('entries')
  @Header('Cache-Control', 'no-store')
  public async list(
    @Param('kind', new ZodValidationPipe(TimelineKindSchema)) kind: TimelineKindDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminTimelineList> {
    return this.respondList(response, await this.listTimeline.execute(kind));
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Adds an entry at the end of its kind and answers 201 with its version as `ETag`.
   *
   * @param {TimelineKindDto} kind - Kind from the route.
   * @param {TimelineEntryRequest} body - Contract-validated content.
   * @param {Response} response - Response receiving the `ETag`.
   * @returns {Promise<AdminTimelineEntryDto>} Created entry.
   */
  @Post('entries')
  @HttpCode(HttpStatus.CREATED)
  public async create(
    @Param('kind', new ZodValidationPipe(TimelineKindSchema)) kind: TimelineKindDto,
    @Body(new ZodValidationPipe(TimelineEntryRequestSchema)) body: TimelineEntryRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminTimelineEntryDto> {
    return this.respondEntry(
      response,
      await this.createEntry.execute(kind, toTimelineEntryDraft(body)),
    );
  }

  /**
   * Method reorder
   * @method reorder
   *
   * @description
   * Orders the kind as `ids` lists it, if the list still has the `If-Match` version.
   *
   * @param {TimelineKindDto} kind - Kind from the route.
   * @param {number} expectedVersion - List version parsed from `If-Match`.
   * @param {TimelineOrderRequest} body - Every entry identifier of the kind.
   * @param {Response} response - Response receiving the new list `ETag`.
   * @returns {Promise<AdminTimelineList>} Reordered list.
   */
  @Put('order')
  public async reorder(
    @Param('kind', new ZodValidationPipe(TimelineKindSchema)) kind: TimelineKindDto,
    @IfMatchVersion() expectedVersion: number,
    @Body(new ZodValidationPipe(TimelineOrderRequestSchema)) body: TimelineOrderRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminTimelineList> {
    return this.respondList(
      response,
      await this.reorderTimeline.execute(kind, expectedVersion, body.ids),
    );
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Loads an entry of the kind with its version as `ETag`.
   *
   * @param {TimelineKindDto} kind - Kind from the route.
   * @param {string} id - Entry identifier.
   * @param {Response} response - Response receiving the `ETag`.
   * @returns {Promise<AdminTimelineEntryDto>} Entry.
   */
  @Get('entries/:id')
  @Header('Cache-Control', 'no-store')
  public async get(
    @Param('kind', new ZodValidationPipe(TimelineKindSchema)) kind: TimelineKindDto,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminTimelineEntryDto> {
    const entry: TimelineEntry = await this.getEntry.execute(kind, id);
    response.setHeader('ETag', versionEtag(entry.version));
    return toAdminTimelineEntryDto(entry);
  }

  /**
   * Method revise
   * @method revise
   *
   * @description
   * Replaces the content of an entry if it still has the `If-Match` version.
   *
   * @param {TimelineKindDto} kind - Kind from the route.
   * @param {string} id - Entry identifier.
   * @param {number} expectedVersion - Entry version parsed from `If-Match`.
   * @param {TimelineEntryRequest} body - Contract-validated content.
   * @param {Response} response - Response receiving the new `ETag`.
   * @returns {Promise<AdminTimelineEntryDto>} Revised entry.
   */
  @Put('entries/:id')
  public async revise(
    @Param('kind', new ZodValidationPipe(TimelineKindSchema)) kind: TimelineKindDto,
    @Param('id') id: string,
    @IfMatchVersion() expectedVersion: number,
    @Body(new ZodValidationPipe(TimelineEntryRequestSchema)) body: TimelineEntryRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminTimelineEntryDto> {
    return this.respondEntry(
      response,
      await this.reviseEntry.execute(kind, id, expectedVersion, toTimelineEntryDraft(body)),
    );
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Deletes an entry if it still has the `If-Match` version and answers the remaining list with its
   * new version as `ETag`.
   *
   * @param {TimelineKindDto} kind - Kind from the route.
   * @param {string} id - Entry identifier.
   * @param {number} expectedVersion - Entry version parsed from `If-Match`.
   * @param {Response} response - Response receiving the list `ETag`.
   * @returns {Promise<AdminTimelineList>} Remaining list.
   */
  @Delete('entries/:id')
  public async remove(
    @Param('kind', new ZodValidationPipe(TimelineKindSchema)) kind: TimelineKindDto,
    @Param('id') id: string,
    @IfMatchVersion() expectedVersion: number,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminTimelineList> {
    return this.respondList(response, await this.deleteEntry.execute(kind, id, expectedVersion));
  }

  /**
   * Method respondList
   * @method respondList
   *
   * @description
   * Sets the list version `ETag` and presents the list.
   *
   * @param {Response} response - Response to update.
   * @param {AdminTimelineView} view - Entries and list version.
   * @returns {AdminTimelineList} Administration list.
   */
  private respondList(response: Response, view: AdminTimelineView): AdminTimelineList {
    response.setHeader('ETag', versionEtag(view.version));
    return toAdminTimelineList(view);
  }

  /**
   * Method respondEntry
   * @method respondEntry
   *
   * @description
   * Sets the entry version `ETag` and presents the entry.
   *
   * @param {Response} response - Response to update.
   * @param {TimelineEntryChangeResult} result - Written entry and version.
   * @returns {AdminTimelineEntryDto} Administration entry.
   */
  private respondEntry(
    response: Response,
    result: TimelineEntryChangeResult,
  ): AdminTimelineEntryDto {
    response.setHeader('ETag', versionEtag(result.version));
    return toAdminTimelineEntryDto(result.entry, result.version);
  }
  // #endregion
}
