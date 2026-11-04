import { Body, Controller, Get, Header, Inject, Put, Res } from '@nestjs/common';
import { AdminOnly } from '@vfortin/backend-auth';
import { IfMatchVersion, ZodValidationPipe, versionEtag } from '@vfortin/backend-http';
import {
  GetAdminProfile,
  type ProfileChangeResult,
  ReviseProfile,
} from '@vfortin/content-application';
import {
  type AdminProfileDto,
  type ProfileRevisionRequest,
  ProfileRevisionRequestSchema,
} from '@vfortin/content-contracts';
import type { Profile } from '@vfortin/content-domain';
import type { Response } from 'express';
import {
  toAdminProfileDto,
  toProfileDraft,
} from '@internal/content-adapters-in/lib/http/presenters/admin-site-texts/admin-site-texts.presenter';

/**
 * Class AdminProfileController
 * @class AdminProfileController
 *
 * @description
 * Administration of the profile (« Informations »: home introduction, « À propos », facts and public
 * links) under `/api/content/admin/profile`. A revision takes the version in `If-Match` and queues a
 * site rebuild, since the profile is always public. `@AdminOnly` runs before the body pipe, so an
 * anonymous call is answered 401 whatever it sends.
 */
@Controller('content/admin/profile')
@AdminOnly()
export class AdminProfileController {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects the profile query and command.
   *
   * @param {GetAdminProfile} getProfile - Loads the profile.
   * @param {ReviseProfile} reviseProfile - Revises the profile.
   */
  public constructor(
    @Inject(GetAdminProfile) private readonly getProfile: GetAdminProfile,
    @Inject(ReviseProfile) private readonly reviseProfile: ReviseProfile,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method get
   * @method get
   *
   * @description
   * Returns the profile with its version as `ETag`.
   *
   * @param {Response} response - Response receiving the `ETag`.
   * @returns {Promise<AdminProfileDto>} Profile.
   */
  @Get()
  @Header('Cache-Control', 'no-store')
  public async get(@Res({ passthrough: true }) response: Response): Promise<AdminProfileDto> {
    const profile: Profile = await this.getProfile.execute();
    response.setHeader('ETag', versionEtag(profile.version));
    return toAdminProfileDto(profile);
  }

  /**
   * Method revise
   * @method revise
   *
   * @description
   * Replaces the profile if it still has the `If-Match` version.
   *
   * @param {number} expectedVersion - Version parsed from `If-Match`.
   * @param {ProfileRevisionRequest} body - Contract-validated content.
   * @param {Response} response - Response receiving the new `ETag`.
   * @returns {Promise<AdminProfileDto>} Revised profile.
   */
  @Put()
  public async revise(
    @IfMatchVersion() expectedVersion: number,
    @Body(new ZodValidationPipe(ProfileRevisionRequestSchema)) body: ProfileRevisionRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminProfileDto> {
    const result: ProfileChangeResult = await this.reviseProfile.execute(
      expectedVersion,
      toProfileDraft(body),
    );
    response.setHeader('ETag', versionEtag(result.profile.version));
    return toAdminProfileDto(result.profile);
  }
  // #endregion
}
