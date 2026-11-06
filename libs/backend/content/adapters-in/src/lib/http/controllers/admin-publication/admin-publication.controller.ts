import { Controller, Get, Header, HttpCode, Inject, Post, Res } from '@nestjs/common';
import { AdminOnly } from '@vfortin/backend-auth';
import { IfMatchVersion, versionEtag } from '@vfortin/backend-http';
import { ManagePublication } from '@vfortin/content-application';
import type { PublicationStatusDto } from '@vfortin/content-contracts';
import type { Response } from 'express';

/** Legacy authenticated publication endpoints; starting a manual batch is no longer supported. */
@Controller('content/admin/publication')
@AdminOnly()
export class AdminPublicationController {
  public constructor(@Inject(ManagePublication) private readonly publication: ManagePublication) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  public async get(@Res({ passthrough: true }) response: Response): Promise<PublicationStatusDto> {
    const status: PublicationStatusDto = await this.publication.status();
    response.setHeader('ETag', versionEtag(status.version));
    return status;
  }
  @Post('start')
  @HttpCode(200)
  public async start(
    @IfMatchVersion() version: number,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicationStatusDto> {
    const status: PublicationStatusDto = await this.publication.start(version);
    response.setHeader('ETag', versionEtag(status.version));
    return status;
  }
  @Post('publish')
  @HttpCode(200)
  public async publish(
    @IfMatchVersion() version: number,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicationStatusDto> {
    const status: PublicationStatusDto = await this.publication.publish(version);
    response.setHeader('ETag', versionEtag(status.version));
    return status;
  }
}
