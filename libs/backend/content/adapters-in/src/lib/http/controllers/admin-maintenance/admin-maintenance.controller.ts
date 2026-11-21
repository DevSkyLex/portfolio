import { Body, Controller, Get, Header, Inject, Put, Res } from '@nestjs/common';
import { AdminOnly } from '@vfortin/backend-auth';
import { IfMatchVersion, ZodValidationPipe, versionEtag } from '@vfortin/backend-http';
import { GetAdminMaintenance, ReviseMaintenance } from '@vfortin/content-application';
import {
  type AdminMaintenanceDto,
  type MaintenanceRequest,
  MaintenanceRequestSchema,
} from '@vfortin/content-contracts';
import type { MaintenanceMode } from '@vfortin/content-domain';
import type { Response } from 'express';
import {
  toAdminMaintenanceDto,
  toMaintenanceDraft,
} from '@internal/content-adapters-in/lib/http/presenters/admin-maintenance/admin-maintenance.presenter';

/**
 * Class AdminMaintenanceController
 * @class AdminMaintenanceController
 *
 * @description
 * Administration of the public site's maintenance mode under `/api/content/admin/maintenance`. A
 * revision takes the version in `If-Match` and applies to the next public request, without a content
 * revision. `@AdminOnly` runs before the body pipe, so an anonymous call is answered 401 whatever it
 * sends.
 */
@Controller('content/admin/maintenance')
@AdminOnly()
export class AdminMaintenanceController {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects the maintenance query and command.
   *
   * @param {GetAdminMaintenance} getMaintenance - Loads the setting.
   * @param {ReviseMaintenance} reviseMaintenance - Revises the setting.
   */
  public constructor(
    @Inject(GetAdminMaintenance) private readonly getMaintenance: GetAdminMaintenance,
    @Inject(ReviseMaintenance) private readonly reviseMaintenance: ReviseMaintenance,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method get
   * @method get
   *
   * @description
   * Returns the setting with its version as `ETag`.
   *
   * @param {Response} response - Response receiving the `ETag`.
   * @returns {Promise<AdminMaintenanceDto>} Setting.
   */
  @Get()
  @Header('Cache-Control', 'no-store')
  public async get(@Res({ passthrough: true }) response: Response): Promise<AdminMaintenanceDto> {
    const mode: MaintenanceMode = await this.getMaintenance.execute();
    response.setHeader('ETag', versionEtag(mode.version));
    return toAdminMaintenanceDto(mode);
  }

  /**
   * Method revise
   * @method revise
   *
   * @description
   * Replaces the setting if it still has the `If-Match` version.
   *
   * @param {number} expectedVersion - Version parsed from `If-Match`.
   * @param {MaintenanceRequest} body - Contract-validated revision.
   * @param {Response} response - Response receiving the new `ETag`.
   * @returns {Promise<AdminMaintenanceDto>} Revised setting.
   */
  @Put()
  public async revise(
    @IfMatchVersion() expectedVersion: number,
    @Body(new ZodValidationPipe(MaintenanceRequestSchema)) body: MaintenanceRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminMaintenanceDto> {
    const mode: MaintenanceMode = await this.reviseMaintenance.execute(
      expectedVersion,
      toMaintenanceDraft(body),
    );
    response.setHeader('ETag', versionEtag(mode.version));
    return toAdminMaintenanceDto(mode);
  }
  // #endregion
}
