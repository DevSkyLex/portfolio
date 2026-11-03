import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { AdminOnly } from '@vfortin/backend-auth';
import { IfMatchVersion, ZodValidationPipe, versionEtag } from '@vfortin/backend-http';
import {
  ArchiveContactMessage,
  DeleteContactMessage,
  ListContactMessages,
  MarkContactMessageRead,
  type MessagePage,
} from '@vfortin/contact-application';
import {
  type ContactMessageDto,
  type ContactMessageList,
  type ContactMessageListQuery,
  ContactMessageListQuerySchema,
} from '@vfortin/contact-contracts';
import type { Response } from 'express';
import { toContactMessageDto } from '@internal/contact-adapters-in/lib/http/presenters/contact-message/contact-message.presenter';

/**
 * Class AdminContactController
 * @class AdminContactController
 *
 * @description
 * Serves guarded administrator inbox operations and exposes message versions through ETags.
 */
@Controller('contact/admin/messages')
@AdminOnly()
export class AdminContactController {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the inbox query, read, archive and erasure use cases.
   * @param {ListContactMessages} listMessages - Inbox page query use case.
   * @param {MarkContactMessageRead} markRead - Version-checked read transition.
   * @param {ArchiveContactMessage} archiveMessage - Version-checked archive transition.
   * @param {DeleteContactMessage} deleteMessage - Message erasure use case.
   */
  public constructor(
    @Inject(ListContactMessages) private readonly listMessages: ListContactMessages,
    @Inject(MarkContactMessageRead) private readonly markRead: MarkContactMessageRead,
    @Inject(ArchiveContactMessage) private readonly archiveMessage: ArchiveContactMessage,
    @Inject(DeleteContactMessage) private readonly deleteMessage: DeleteContactMessage,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Returns the requested inbox page without allowing it to be cached by intermediaries.
   * @param {ContactMessageListQuery} query - Validated status and page query.
   * @returns {Promise<ContactMessageList>} Page DTOs and pagination metadata.
   */
  @Get()
  @Header('Cache-Control', 'no-store')
  public async list(
    @Query(new ZodValidationPipe(ContactMessageListQuerySchema)) query: ContactMessageListQuery,
  ): Promise<ContactMessageList> {
    const page: MessagePage = await this.listMessages.execute({
      status: query.status ?? null,
      page: query.page,
      pageSize: query.pageSize,
    });
    return {
      member: page.items.map((message) => toContactMessageDto(message)),
      totalItems: page.total,
      view: { page: query.page, pageSize: query.pageSize },
    };
  }

  /**
   * Method read
   * @method read
   *
   * @description
   * Marks a message read using the caller's If-Match version and returns the new ETag.
   * @param {string} id - Message identifier.
   * @param {number} expectedVersion - Version supplied by the If-Match header.
   * @param {Response} response - Response used to set the new ETag.
   * @returns {Promise<ContactMessageDto>} Updated message representation.
   */
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  public async read(
    @Param('id') id: string,
    @IfMatchVersion() expectedVersion: number,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ContactMessageDto> {
    const result: Awaited<ReturnType<MarkContactMessageRead['execute']>> =
      await this.markRead.execute(id, expectedVersion);
    response.setHeader('ETag', versionEtag(result.version));
    return toContactMessageDto(result.message, result.version);
  }

  /**
   * Method archive
   * @method archive
   *
   * @description
   * Archives a message using the caller's If-Match version and returns the new ETag.
   * @param {string} id - Message identifier.
   * @param {number} expectedVersion - Version supplied by the If-Match header.
   * @param {Response} response - Response used to set the new ETag.
   * @returns {Promise<ContactMessageDto>} Updated message representation.
   */
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  public async archive(
    @Param('id') id: string,
    @IfMatchVersion() expectedVersion: number,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ContactMessageDto> {
    const result: Awaited<ReturnType<ArchiveContactMessage['execute']>> =
      await this.archiveMessage.execute(id, expectedVersion);
    response.setHeader('ETag', versionEtag(result.version));
    return toContactMessageDto(result.message, result.version);
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Erases the identified inbox message and returns HTTP 204 after completion.
   * @param {string} id - Message identifier to erase.
   * @returns {Promise<void>} Completion after erasure.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async remove(@Param('id') id: string): Promise<void> {
    await this.deleteMessage.execute(id);
  }
  // #endregion
}
