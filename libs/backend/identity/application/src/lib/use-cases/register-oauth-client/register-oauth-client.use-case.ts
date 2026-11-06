import { OAuthClient, OAuthError } from '@vfortin/identity-domain';
import type {
  Clock,
  IdGenerator,
} from '@internal/identity-application/lib/ports/identity/identity.ports';
import type { OAuthUnitOfWork } from '@internal/identity-application/lib/ports/oauth/oauth.ports';

/**
 * Constant MAX_REGISTRATIONS_PER_HOUR
 *
 * @description
 * Dynamic registrations accepted per rolling hour, all addresses together (Nginx also limits each
 * address): registration is unauthenticated, so the table must not grow without bound.
 *
 * @type {number}
 */
export const MAX_REGISTRATIONS_PER_HOUR = 60 as const;

/**
 * Constant ABANDONED_REGISTRATION_MS
 *
 * @description
 * Age after which a dynamic registration that never received a consent is deleted, in milliseconds.
 *
 * @type {number}
 */
export const ABANDONED_REGISTRATION_MS: number = 24 * 60 * 60 * 1000;

/**
 * Class RegisterOAuthClient
 * @class RegisterOAuthClient
 *
 * @description
 * Dynamic Client Registration (D45, RFC 7591), kept for MCP clients that predate Client ID Metadata
 * Documents. Public clients only, `https` or loopback redirect URIs, a global hourly cap, and
 * registrations never consented to are purged after a day. The consent screen flags these clients
 * as unverified: nothing vouches for the name they chose.
 */
export class RegisterOAuthClient {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Supplies the transaction boundary, identifiers and clock.
   *
   * @param {OAuthUnitOfWork} unitOfWork - Transaction boundary.
   * @param {IdGenerator} ids - Client identifiers.
   * @param {Clock} clock - Registration time.
   */
  public constructor(
    private readonly unitOfWork: OAuthUnitOfWork,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Validates the metadata, enforces the cap and stores the client.
   *
   * @param {unknown} metadata - Parsed JSON body.
   *
   * @returns {Promise<OAuthClient>} Registered client.
   *
   * @throws {OAuthError} `invalid_client_metadata` or `invalid_redirect_uri` for the body,
   * `temporarily_unavailable` beyond the cap.
   */
  public async execute(metadata: unknown): Promise<OAuthClient> {
    const now: Date = this.clock.now();
    const client: OAuthClient = OAuthClient.register(this.ids.next(), metadata, now);
    return this.unitOfWork.run(async ({ clients }): Promise<OAuthClient> => {
      await clients.deleteAbandonedDynamic(new Date(now.getTime() - ABANDONED_REGISTRATION_MS));
      const recent: number = await clients.countDynamicSince(new Date(now.getTime() - 3_600_000));
      if (recent >= MAX_REGISTRATIONS_PER_HOUR) {
        throw new OAuthError(
          'temporarily_unavailable',
          'Too many client registrations; try again later.',
        );
      }
      await clients.save(client);
      return client;
    });
  }
  // #endregion
}
