import {
  type OAuthScope,
  canonicalScopes,
} from '@internal/identity-domain/lib/oauth/scope/oauth-scope';

/**
 * Interface OAuthGrantProps
 * @interface OAuthGrantProps
 *
 * @description
 * Persisted consent of the administrator to one client: the scopes approved so far and its audit
 * instants.
 */
export interface OAuthGrantProps {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Grant identifier, used by « Applications connectées » to revoke it.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property accountId
   * @readonly
   *
   * @description
   * Administrator who consented.
   *
   * @type {string}
   */
  readonly accountId: string;

  /**
   * Property clientId
   * @readonly
   *
   * @description
   * Client the consent was given to.
   *
   * @type {string}
   */
  readonly clientId: string;

  /**
   * Property scopes
   * @readonly
   *
   * @description
   * Union of the scopes approved for this client, in canonical order.
   *
   * @type {readonly OAuthScope[]}
   */
  readonly scopes: readonly OAuthScope[];

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * First consent.
   *
   * @type {Date}
   */
  readonly createdAt: Date;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * Latest consent.
   *
   * @type {Date}
   */
  readonly updatedAt: Date;

  /**
   * Property lastUsedAt
   * @readonly
   *
   * @description
   * Latest token issued under the grant, `null` before the first exchange. A read model: the
   * repository derives it from the families' last use, so that a refresh never writes the grant row
   * (which a revocation locks before the families).
   *
   * @type {Date | null}
   */
  readonly lastUsedAt: Date | null;

  /**
   * Property revokedAt
   * @readonly
   *
   * @description
   * Revocation by the owner, `null` while active.
   *
   * @type {Date | null}
   */
  readonly revokedAt: Date | null;
  // #endregion
}

/**
 * Class OAuthGrant
 * @class OAuthGrant
 *
 * @description
 * Consent of the administrator to a client (D45). A revoked grant refuses every code exchange and
 * refresh made under it; a later consent opens a new grant.
 */
export class OAuthGrant {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores grant state.
   *
   * @param {OAuthGrantProps} props - Grant state.
   */
  private constructor(private readonly props: OAuthGrantProps) {}
  // #endregion

  // #region Methods
  /**
   * Method create
   * @method create
   * @static
   *
   * @description
   * Records a first consent.
   *
   * @param {Pick<OAuthGrantProps, 'id' | 'accountId' | 'clientId' | 'scopes'>} input - Identity and approved scopes.
   * @param {Date} now - Consent instant.
   *
   * @returns {OAuthGrant} Active grant.
   */
  public static create(
    input: Pick<OAuthGrantProps, 'id' | 'accountId' | 'clientId' | 'scopes'>,
    now: Date,
  ): OAuthGrant {
    return new OAuthGrant({
      ...input,
      scopes: canonicalScopes(input.scopes),
      createdAt: now,
      updatedAt: now,
      lastUsedAt: null,
      revokedAt: null,
    });
  }

  /**
   * Method rehydrate
   * @method rehydrate
   * @static
   *
   * @description
   * Restores persisted state.
   *
   * @param {OAuthGrantProps} props - Persisted state.
   *
   * @returns {OAuthGrant} Restored grant.
   */
  public static rehydrate(props: OAuthGrantProps): OAuthGrant {
    return new OAuthGrant(props);
  }

  /**
   * Method id
   * @method id
   *
   * @description
   * Returns the grant identifier.
   *
   * @returns {string} Identifier.
   */
  public get id(): string {
    return this.props.id;
  }

  /**
   * Method accountId
   * @method accountId
   *
   * @description
   * Returns the consenting administrator.
   *
   * @returns {string} Account identifier.
   */
  public get accountId(): string {
    return this.props.accountId;
  }

  /**
   * Method clientId
   * @method clientId
   *
   * @description
   * Returns the client.
   *
   * @returns {string} Client identifier.
   */
  public get clientId(): string {
    return this.props.clientId;
  }

  /**
   * Method scopes
   * @method scopes
   *
   * @description
   * Returns the approved scopes.
   *
   * @returns {readonly OAuthScope[]} Scopes.
   */
  public get scopes(): readonly OAuthScope[] {
    return this.props.scopes;
  }

  /**
   * Method isActive
   * @method isActive
   *
   * @description
   * Whether the owner has not revoked the grant.
   *
   * @returns {boolean} Whether tokens may be issued under it.
   */
  public get isActive(): boolean {
    return this.props.revokedAt === null;
  }

  /**
   * Method extended
   * @method extended
   *
   * @description
   * Records a new consent of the same client, keeping the union of the scopes approved so far (a
   * step-up adds scopes; earlier tokens keep theirs).
   *
   * @param {readonly OAuthScope[]} scopes - Newly approved scopes.
   * @param {Date} now - Consent instant.
   *
   * @returns {OAuthGrant} Updated grant.
   */
  public extended(scopes: readonly OAuthScope[], now: Date): OAuthGrant {
    return new OAuthGrant({
      ...this.props,
      scopes: canonicalScopes([...this.props.scopes, ...scopes]),
      updatedAt: now,
    });
  }

  /**
   * Method revoked
   * @method revoked
   *
   * @description
   * Records the owner's revocation.
   *
   * @param {Date} now - Revocation instant.
   *
   * @returns {OAuthGrant} Revoked grant.
   */
  public revoked(now: Date): OAuthGrant {
    return new OAuthGrant({ ...this.props, revokedAt: this.props.revokedAt ?? now });
  }

  /**
   * Method snapshot
   * @method snapshot
   *
   * @description
   * Returns a shallow copy for persistence and listing.
   *
   * @returns {OAuthGrantProps} Grant state.
   */
  public snapshot(): OAuthGrantProps {
    return { ...this.props };
  }
  // #endregion
}
