import { type OAuthScope, type OAuthTokenFamily, RefreshToken } from '@vfortin/identity-domain';
import type {
  AccessToken,
  IdGenerator,
  RefreshTokenCodec,
} from '@internal/identity-application/lib/ports/identity/identity.ports';
import type {
  OAuthTokenRepository,
  ResourceTokenSigner,
} from '@internal/identity-application/lib/ports/oauth/oauth.ports';

/**
 * Interface OAuthTokenServices
 * @interface OAuthTokenServices
 *
 * @description
 * Stateless services of the token endpoint.
 */
export interface OAuthTokenServices {
  // #region Properties
  /** Signs the MCP access tokens. */
  readonly signer: ResourceTokenSigner;
  /** Generates the opaque refresh tokens and codes and hashes them. */
  readonly codec: RefreshTokenCodec;
  /** Generates record identifiers. */
  readonly ids: IdGenerator;
  // #endregion
}

/**
 * Interface IssuedTokens
 * @interface IssuedTokens
 *
 * @description
 * Token endpoint answer before transport mapping.
 */
export interface IssuedTokens {
  // #region Properties
  /** Signed MCP access token. */
  readonly accessToken: string;
  /** Access token lifetime, in seconds. */
  readonly expiresIn: number;
  /** New opaque refresh token. */
  readonly refreshToken: string;
  /** Scopes of the access token. */
  readonly scopes: readonly OAuthScope[];
  // #endregion
}

/**
 * Function issueResourceTokens
 *
 * @description
 * Stores a new hashed refresh token in the family, records the family's use and signs an access
 * token for the given scopes. The caller holds the family lock and owns the transaction.
 *
 * @param {OAuthTokenServices} services - Signer, codec and identifiers.
 * @param {OAuthTokenRepository} tokens - Transaction-bound token repository.
 * @param {OAuthTokenFamily} family - Family of the token.
 * @param {readonly OAuthScope[]} scopes - Scopes of the access token, within the family's.
 * @param {Date} now - Issuance instant.
 *
 * @returns {Promise<IssuedTokens>} Access and refresh credentials.
 */
export async function issueResourceTokens(
  services: OAuthTokenServices,
  tokens: OAuthTokenRepository,
  family: OAuthTokenFamily,
  scopes: readonly OAuthScope[],
  now: Date,
): Promise<IssuedTokens> {
  const refreshToken: string = services.codec.generate();
  await tokens.add(
    RefreshToken.issue(
      { id: services.ids.next(), tokenHash: services.codec.hash(refreshToken) },
      family,
      now,
    ),
  );
  await tokens.touchFamily(family.id, now);
  const access: AccessToken = await services.signer.sign(
    {
      accountId: family.accountId,
      clientId: family.clientId,
      scopes,
      resource: family.resource,
    },
    now,
  );
  return { accessToken: access.token, expiresIn: access.expiresIn, refreshToken, scopes };
}
