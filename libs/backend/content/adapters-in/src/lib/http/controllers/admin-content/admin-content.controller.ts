import {
  Body,
  Controller,
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
  type AdminProjectView,
  GetAdminProject,
  ListAdminProjects,
  type MediaRecord,
  PublishProject,
  type ProjectChangeResult,
  ReviseProject,
  UnpublishProject,
} from '@vfortin/content-application';
import {
  type AdminProjectDto,
  type AdminProjectList,
  type ProjectRevisionRequest,
  ProjectRevisionRequestSchema,
} from '@vfortin/content-contracts';
import type { Project } from '@vfortin/content-domain';
import type { Response } from 'express';
import {
  toAdminProjectDto,
  toProjectRevision,
} from '@internal/content-adapters-in/lib/http/presenters/admin-project/admin-project.presenter';

/**
 * Class AdminContentController
 * @class AdminContentController
 *
 * @description
 * Exposes authenticated project administration routes and uses `If-Match` versions for writes.
 */
@Controller('content/admin/projects')
@AdminOnly()
export class AdminContentController {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects project query and command use cases used by the administration routes.
   *
   * @param {ListAdminProjects} listProjects - Lists drafts and published projects.
   * @param {GetAdminProject} getProject - Loads a project by identifier.
   * @param {ReviseProject} reviseProject - Applies project text edits.
   * @param {PublishProject} publishProject - Publishes a complete project.
   * @param {UnpublishProject} unpublishProject - Returns a project to draft state.
   */
  public constructor(
    @Inject(ListAdminProjects) private readonly listProjects: ListAdminProjects,
    @Inject(GetAdminProject) private readonly getProject: GetAdminProject,
    @Inject(ReviseProject) private readonly reviseProject: ReviseProject,
    @Inject(PublishProject) private readonly publishProject: PublishProject,
    @Inject(UnpublishProject) private readonly unpublishProject: UnpublishProject,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Returns every administration project and the total count, with cache storage disabled.
   *
   * @returns {Promise<AdminProjectList>} Project list response and item count.
   */
  @Get()
  @Header('Cache-Control', 'no-store')
  public async list(): Promise<AdminProjectList> {
    const member: AdminProjectDto[] = (await this.listProjects.execute()).map(
      (view: AdminProjectView): AdminProjectDto => toAdminProjectDto(view.project, view.media),
    );
    return { member, totalItems: member.length };
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Loads one project and sets its version ETag on the response for subsequent conditional writes.
   *
   * @param {string} id - Project identifier from the route.
   * @param {Response} response - Express response receiving the ETag.
   * @returns {Promise<AdminProjectDto>} Administration project representation.
   */
  @Get(':id')
  @Header('Cache-Control', 'no-store')
  public async get(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminProjectDto> {
    const view: AdminProjectView = await this.getProject.execute(id);
    return this.respond(response, view.project, view.media);
  }

  /**
   * Method revise
   * @method revise
   *
   * @description
   * Validates the edit payload, applies it against the `If-Match` version and returns the new ETag.
   *
   * @param {string} id - Project identifier from the route.
   * @param {number} expectedVersion - Version parsed from `If-Match`.
   * @param {ProjectRevisionRequest} body - Contract-validated editable fields.
   * @param {Response} response - Express response receiving the updated ETag.
   * @returns {Promise<AdminProjectDto>} Updated administration project representation.
   */
  @Put(':id')
  public async revise(
    @Param('id') id: string,
    @IfMatchVersion() expectedVersion: number,
    @Body(new ZodValidationPipe(ProjectRevisionRequestSchema)) body: ProjectRevisionRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminProjectDto> {
    const result: ProjectChangeResult = await this.reviseProject.execute(
      id,
      expectedVersion,
      toProjectRevision(body),
    );
    return this.respond(response, result.project, result.media, result.version);
  }

  /**
   * Method publish
   * @method publish
   *
   * @description
   * Publishes the project at the supplied version and returns its new ETag.
   *
   * @param {string} id - Project identifier from the route.
   * @param {number} expectedVersion - Version parsed from `If-Match`.
   * @param {Response} response - Express response receiving the updated ETag.
   * @returns {Promise<AdminProjectDto>} Published project representation.
   */
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  public async publish(
    @Param('id') id: string,
    @IfMatchVersion() expectedVersion: number,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminProjectDto> {
    const result: ProjectChangeResult = await this.publishProject.execute(id, expectedVersion);
    return this.respond(response, result.project, result.media, result.version);
  }

  /**
   * Method unpublish
   * @method unpublish
   *
   * @description
   * Moves the project to draft state at the supplied version and returns its new ETag.
   *
   * @param {string} id - Project identifier from the route.
   * @param {number} expectedVersion - Version parsed from `If-Match`.
   * @param {Response} response - Express response receiving the updated ETag.
   * @returns {Promise<AdminProjectDto>} Updated project representation.
   */
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  public async unpublish(
    @Param('id') id: string,
    @IfMatchVersion() expectedVersion: number,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminProjectDto> {
    const result: ProjectChangeResult = await this.unpublishProject.execute(id, expectedVersion);
    return this.respond(response, result.project, result.media, result.version);
  }

  /**
   * Method respond
   * @method respond
   *
   * @description
   * Sets the project version ETag and converts the aggregate and its media into the administration
   * DTO.
   *
   * @param {Response} response - Express response to update.
   * @param {Project} project - Aggregate returned by the command or query.
   * @param {readonly MediaRecord[]} media - Stored media the project references.
   * @param {number} version - Version to publish; defaults to the aggregate version.
   * @returns {AdminProjectDto} Project representation with missing publication fields.
   */
  private respond(
    response: Response,
    project: Project,
    media: readonly MediaRecord[],
    version: number = project.version,
  ): AdminProjectDto {
    response.setHeader('ETag', versionEtag(version));
    return toAdminProjectDto(project, media, version);
  }
  // #endregion
}
