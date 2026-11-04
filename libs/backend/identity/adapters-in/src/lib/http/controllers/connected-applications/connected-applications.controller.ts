import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Req,
} from '@nestjs/common';
import { AdminOnly } from '@vfortin/backend-auth';
import {
  type ConnectedApplicationRecord,
  ListConnectedApplications,
  RevokeConnectedApplication,
} from '@vfortin/identity-application';
import type {
  ConnectedApplication,
  ConnectedApplicationsResponse,
} from '@vfortin/identity-contracts';
import type { OAuthGrantProps } from '@vfortin/identity-domain';
import type { Request } from 'express';
import { claimsOf } from '@internal/identity-adapters-in/lib/http/controllers/oauth-consent/oauth-consent.controller';

/**
 * Function toConnectedApplication
 *
 * @description
 * Presents an active grant and its client.
 *
 * @param {ConnectedApplicationRecord} record - Grant and client.
 *
 * @returns {ConnectedApplication} Listed application.
 */
function toConnectedApplication(record: ConnectedApplicationRecord): ConnectedApplication {
  const grant: OAuthGrantProps = record.grant.snapshot();
  return {
    id: grant.id,
    clientId: record.client.id,
    name: record.client.name,
    logo: record.client.logo,
    host: record.client.host,
    registration: record.client.kind,
    scopes: [...grant.scopes],
    createdAt: grant.createdAt.toISOString(),
    lastUsedAt: grant.lastUsedAt?.toISOString() ?? null,
  };
}

/**
 * Class ConnectedApplicationsController
 * @class ConnectedApplicationsController
 *
 * @description
 * « Applications connectées » of the security page (D45): lists the consented MCP clients and
 * revokes one (its consent and every refresh token issued under it). Bearer-authenticated.
 */
@Controller('auth/admin/oauth/applications')
@AdminOnly()
export class ConnectedApplicationsController {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects the listing and revocation use cases.
   *
   * @param {ListConnectedApplications} listUseCase - Listing.
   * @param {RevokeConnectedApplication} revokeUseCase - Revocation.
   */
  public constructor(
    @Inject(ListConnectedApplications) private readonly listUseCase: ListConnectedApplications,
    @Inject(RevokeConnectedApplication) private readonly revokeUseCase: RevokeConnectedApplication,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Lists the active consents, newest first.
   *
   * @param {Request} request - Guarded request.
   *
   * @returns {Promise<ConnectedApplicationsResponse>} Connected applications.
   */
  @Get()
  @Header('Cache-Control', 'no-store')
  public async list(@Req() request: Request): Promise<ConnectedApplicationsResponse> {
    const records: readonly ConnectedApplicationRecord[] = await this.listUseCase.execute(
      claimsOf(request).sub,
    );
    return { items: records.map(toConnectedApplication) };
  }

  /**
   * Method revoke
   * @method revoke
   *
   * @description
   * Revokes a consent; 404 when it is unknown, foreign or already revoked.
   *
   * @param {string} id - Grant identifier.
   * @param {Request} request - Guarded request.
   *
   * @returns {Promise<void>} Empty 204 answer.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async revoke(@Param('id') id: string, @Req() request: Request): Promise<void> {
    await this.revokeUseCase.execute({ accountId: claimsOf(request).sub, grantId: id });
  }
  // #endregion
}
