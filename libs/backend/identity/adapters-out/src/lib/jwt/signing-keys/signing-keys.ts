import type {
  AccessToken,
  ResourceTokenClaims,
  ResourceTokenSigner,
  TokenSigner,
} from '@vfortin/identity-application';
import { formatScopes } from '@vfortin/identity-domain';
import { SignJWT } from 'jose';
import {
  type KeyObject,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomUUID,
} from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Interface PublicJwk
 * @interface PublicJwk
 *
 * @description
 * Public Ed25519 JSON Web Key fields published for downstream token verification.
 */
export interface PublicJwk {
  // #region Properties
  /**
   * Property kty
   * @readonly
   *
   * @description
   * JWK key type, set to `OKP` for Ed25519 public keys.
   *
   * @type {string}
   */
  readonly kty: string;

  /**
   * Property crv
   * @readonly
   *
   * @description
   * Optional curve identifier included in exported Ed25519 keys.
   *
   * @type {string | undefined}
   */
  readonly crv?: string;

  /**
   * Property x
   * @readonly
   *
   * @description
   * Optional base64url-encoded public coordinate emitted by Node's JWK exporter.
   *
   * @type {string | undefined}
   */
  readonly x?: string;

  /**
   * Property kid
   * @readonly
   *
   * @description
   * Key identifier matching the PEM filename stem and access-token header.
   *
   * @type {string}
   */
  readonly kid: string;

  /**
   * Property alg
   * @readonly
   *
   * @description
   * Signing algorithm advertised for this public key.
   *
   * @type {'EdDSA'}
   */
  readonly alg: 'EdDSA';

  /**
   * Property use
   * @readonly
   *
   * @description
   * JWK use marker identifying this key for signatures.
   *
   * @type {'sig'}
   */
  readonly use: 'sig';
  // #endregion
}

/**
 * Interface SigningKeys
 * @interface SigningKeys
 *
 * @description
 * Loaded signing private key and public-key set returned by the key-directory adapter.
 */
export interface SigningKeys {
  // #region Properties
  /**
   * Property signing
   * @readonly
   *
   * @description
   * Current key identifier and private key used to sign access tokens.
   *
   * @type {{ readonly kid: string; readonly key: KeyObject }}
   */
  readonly signing: { readonly kid: string; readonly key: KeyObject };

  /**
   * Property jwks
   * @readonly
   *
   * @description
   * Public keys loaded from the directory, including new keys before they are selected for signing.
   *
   * @type {{ readonly keys: PublicJwk[] }}
   */
  readonly jwks: { readonly keys: PublicJwk[] };
  // #endregion
}

/**
 * Constant KID
 *
 * @description
 * Accepted key identifier format: one to sixty-four letters, digits, underscores or hyphens.
 *
 * @type {RegExp}
 */
const KID: RegExp = /^[\w-]{1,64}$/;

/**
 * Function loadSigningKeys
 *
 * @description
 * Loads PKCS#8 Ed25519 private keys from a directory, selects the requested signing key and exports each public key. Rotation requires publishing the new key before selecting it, then retaining the old key during the verifier overlap window.
 *
 * @param {string} folder - Directory containing `<kid>.pem` files.
 * @param {string} signingKid - Identifier of the private key used for signing.
 *
 * @returns {Promise<SigningKeys>} Selected private signing key and public JWKS.
 */
export async function loadSigningKeys(folder: string, signingKid: string): Promise<SigningKeys> {
  const files: string[] = (await readdir(folder)).filter((file: string): boolean =>
    file.endsWith('.pem'),
  );
  const keys: { kid: string; key: KeyObject }[] = await Promise.all(
    files.map(async (file: string): Promise<{ kid: string; key: KeyObject }> => {
      const kid: string = file.slice(0, -'.pem'.length);
      const key: KeyObject = createPrivateKey(await readFile(join(folder, file), 'utf8'));
      if (key.asymmetricKeyType !== 'ed25519') {
        throw new Error(`Key ${file}: Ed25519 expected.`);
      }
      return { kid, key };
    }),
  );
  const signing: { kid: string; key: KeyObject } | undefined = keys.find(
    (entry: { kid: string; key: KeyObject }): boolean => entry.kid === signingKid,
  );
  if (!signing) {
    throw new Error(`Signing key "${signingKid}" missing from ${folder}.`);
  }
  return {
    signing,
    jwks: {
      keys: keys.map(({ kid, key }): PublicJwk => {
        const jwk: JsonWebKey = createPublicKey(key).export({ format: 'jwk' });
        return {
          kty: String(jwk.kty),
          crv: jwk.crv,
          x: jwk.x,
          kid,
          alg: 'EdDSA',
          use: 'sig',
        } as PublicJwk;
      }),
    },
  };
}

/**
 * Function generateSigningKey
 *
 * @description
 * Generates an Ed25519 PKCS#8 private key and creates a new file without overwriting an existing key.
 *
 * @param {string} folder - Directory where the key file is created.
 * @param {string} kid - Key identifier used as the filename stem.
 *
 * @returns {Promise<string>} Path to the created PEM file.
 *
 * The promise rejects when the identifier is invalid, key generation fails or the destination already exists.
 */
export async function generateSigningKey(folder: string, kid: string): Promise<string> {
  if (!KID.test(kid)) {
    throw new Error('Invalid key ID: letters, digits, hyphens.');
  }
  await mkdir(folder, { recursive: true });
  const { privateKey } = generateKeyPairSync('ed25519');
  const path: string = join(folder, `${kid}.pem`);
  await writeFile(path, privateKey.export({ format: 'pem', type: 'pkcs8' }), {
    mode: 0o600,
    flag: 'wx',
  });
  return path;
}

/**
 * Constant ACCESS_TTL_SECONDS
 *
 * @description
 * Access-token validity period returned to clients, in seconds. Kept short because an access token
 * cannot be revoked: logout and replay revocation act on the refresh family, which ends the session
 * within this delay. The verifiers' `maxTokenAge` in `platform/auth` follows it.
 *
 * @type {number}
 */
export const ACCESS_TTL_SECONDS = 300 as const;

/**
 * Constant ACCESS_TOKEN_TYPE
 *
 * @description
 * `typ` header of the access tokens (RFC 9068), required by the verifiers so that no other JWT signed
 * with the same keys is accepted as an access token.
 *
 * @type {string}
 */
export const ACCESS_TOKEN_TYPE = 'at+jwt' as const;

/**
 * Class JoseTokenSigner
 * @class JoseTokenSigner
 *
 * @description
 * Signs administrator JWTs with EdDSA and claims bound to configured issuer, audience and validity period.
 */
export class JoseTokenSigner implements TokenSigner {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the selected signing key and token issuer and audience claims.
   *
   * @param {SigningKeys} keys - Current private key and key identifier.
   * @param {string} issuer - Issuer claim included in the JWT.
   * @param {string} audience - Audience claim included in the JWT.
   */
  public constructor(
    private readonly keys: SigningKeys,
    private readonly issuer: string,
    private readonly audience: string,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method sign
   * @method sign
   *
   * @description
   * Signs an `at+jwt` administrator token with subject, role, session, issuer, audience, issued-at,
   * not-before, expiry and unique token identifier claims.
   *
   * @param {string} accountId - Account identifier used as the JWT subject.
   * @param {string} sessionId - Refresh-token family carried as the `sid` claim.
   * @param {Date} now - Issuance time used for the JWT timestamps.
   *
   * @returns {Promise<AccessToken>} Signed token and its configured lifetime.
   */
  public async sign(accountId: string, sessionId: string, now: Date): Promise<AccessToken> {
    const issuedAt: number = Math.floor(now.getTime() / 1000);
    const token: string = await new SignJWT({ role: 'admin', sid: sessionId })
      .setProtectedHeader({ alg: 'EdDSA', kid: this.keys.signing.kid, typ: ACCESS_TOKEN_TYPE })
      .setSubject(accountId)
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setIssuedAt(issuedAt)
      .setNotBefore(issuedAt)
      .setExpirationTime(issuedAt + ACCESS_TTL_SECONDS)
      .setJti(randomUUID())
      .sign(this.keys.signing.key);
    return { token, expiresIn: ACCESS_TTL_SECONDS };
  }
  // #endregion
}

/**
 * Constant RESOURCE_ACCESS_TTL_SECONDS
 *
 * @description
 * Lifetime of an MCP access token, in seconds (D45): as short as the administrator's, since revoking a
 * connected application only stops its refreshes; `@vfortin/backend-auth` checks the same age.
 *
 * @type {number}
 */
export const RESOURCE_ACCESS_TTL_SECONDS = 300 as const;

/**
 * Class JoseResourceTokenSigner
 * @class JoseResourceTokenSigner
 * @implements ResourceTokenSigner
 *
 * @description
 * Signs MCP access tokens (RFC 9068) with the identity keys: `typ: at+jwt`, EdDSA, `aud` the resource
 * (RFC 8707), `client_id` and `scope`, and neither `role` nor `sid`, so the administrator guard
 * refuses them on two counts (audience and shape).
 */
export class JoseResourceTokenSigner implements ResourceTokenSigner {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the signing key and the issuer.
   *
   * @param {SigningKeys} keys - Current private key and key identifier.
   * @param {string} issuer - Issuer claim.
   */
  public constructor(
    private readonly keys: SigningKeys,
    private readonly issuer: string,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method sign
   * @method sign
   *
   * @description
   * Signs a token for the administrator, the client, the scopes and the resource.
   *
   * @param {ResourceTokenClaims} claims - Token statements.
   * @param {Date} now - Issuance time.
   *
   * @returns {Promise<AccessToken>} Signed token and its lifetime.
   */
  public async sign(claims: ResourceTokenClaims, now: Date): Promise<AccessToken> {
    const issuedAt: number = Math.floor(now.getTime() / 1000);
    const token: string = await new SignJWT({
      client_id: claims.clientId,
      scope: formatScopes(claims.scopes),
    })
      .setProtectedHeader({ alg: 'EdDSA', kid: this.keys.signing.kid, typ: ACCESS_TOKEN_TYPE })
      .setSubject(claims.accountId)
      .setIssuer(this.issuer)
      .setAudience(claims.resource)
      .setIssuedAt(issuedAt)
      .setNotBefore(issuedAt)
      .setExpirationTime(issuedAt + RESOURCE_ACCESS_TTL_SECONDS)
      .setJti(randomUUID())
      .sign(this.keys.signing.key);
    return { token, expiresIn: RESOURCE_ACCESS_TTL_SECONDS };
  }
  // #endregion
}
