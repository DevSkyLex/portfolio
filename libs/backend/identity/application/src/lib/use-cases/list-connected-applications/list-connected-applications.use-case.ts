import type {
  ConnectedApplicationRecord,
  OAuthUnitOfWork,
} from '@internal/identity-application/lib/ports/oauth/oauth.ports';

/**
 * Class ListConnectedApplications
 * @class ListConnectedApplications
 *
 * @description
 * « Applications connectées » of the security page (D45): the clients the administrator consented to
 * and has not revoked, most recent consent first.
 */
export class ListConnectedApplications {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Supplies the transaction boundary.
   *
   * @param {OAuthUnitOfWork} unitOfWork - Transaction boundary of the read.
   */
  public constructor(private readonly unitOfWork: OAuthUnitOfWork) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Lists the active grants with their clients.
   *
   * @param {string} accountId - Subject of the administrator access token.
   *
   * @returns {Promise<readonly ConnectedApplicationRecord[]>} Connected applications.
   */
  public execute(accountId: string): Promise<readonly ConnectedApplicationRecord[]> {
    return this.unitOfWork.run(({ grants }): Promise<readonly ConnectedApplicationRecord[]> =>
      grants.listActive(accountId),
    );
  }
  // #endregion
}
