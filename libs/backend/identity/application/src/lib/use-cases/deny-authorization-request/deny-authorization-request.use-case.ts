import type { AuthorizationRequest, AuthorizationRequestProps } from '@vfortin/identity-domain';
import { AuthorizationRequestExpiredError } from '@internal/identity-application/lib/errors/application-error';
import type { Clock } from '@internal/identity-application/lib/ports/identity/identity.ports';
import type {
  OAuthServerSettings,
  OAuthUnitOfWork,
} from '@internal/identity-application/lib/ports/oauth/oauth.ports';
import type { AuthorizationDecisionCommand } from '@internal/identity-application/lib/use-cases/approve-authorization-request/approve-authorization-request.use-case';
import { authorizationRedirect } from '@internal/identity-application/lib/use-cases/oauth-redirect/oauth-redirect';

/**
 * Class DenyAuthorizationRequest
 * @class DenyAuthorizationRequest
 *
 * @description
 * « Refuser » on the consent screen (D45): closes the request and returns the `access_denied` error
 * redirect with `state` and `iss`. Nothing is granted.
 */
export class DenyAuthorizationRequest {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Supplies the transaction boundary, settings and clock.
   *
   * @param {OAuthUnitOfWork} unitOfWork - Transaction boundary.
   * @param {OAuthServerSettings} settings - Issuer.
   * @param {Clock} clock - Decision time.
   */
  public constructor(
    private readonly unitOfWork: OAuthUnitOfWork,
    private readonly settings: OAuthServerSettings,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Locks and closes the request.
   *
   * @param {AuthorizationDecisionCommand} command - Request and deciding session.
   *
   * @returns {Promise<string>} Error redirect URL.
   *
   * @throws {AuthorizationRequestExpiredError} When the request cannot be decided by this session.
   */
  public async execute(command: AuthorizationDecisionCommand): Promise<string> {
    const now: Date = this.clock.now();
    return this.unitOfWork.run(async ({ requests }): Promise<string> => {
      const request: AuthorizationRequest | null = await requests.lockById(command.requestId);
      if (request === null || !request.isDecidableBy(command.accountId, command.sessionId, now)) {
        throw new AuthorizationRequestExpiredError();
      }
      await requests.save(request.decided(now));
      const values: AuthorizationRequestProps = request.values;
      return authorizationRedirect(
        values.redirectUri,
        {
          error: 'access_denied',
          error_description: 'The owner denied the request.',
          state: values.state,
        },
        this.settings.issuer,
      );
    });
  }
  // #endregion
}
