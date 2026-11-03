/**
 * Constant TRUSTED_DEVICE_TTL_MS
 *
 * @description
 * Absolute lifetime of a trusted device from its creation, in milliseconds; using the device does not
 * extend it, so the one-time code is asked again at least once a month.
 *
 * @type {number}
 */
export const TRUSTED_DEVICE_TTL_MS: number = 30 * 24 * 3600 * 1000;

/**
 * Interface TrustedDeviceProps
 * @interface TrustedDeviceProps
 *
 * @description
 * Persisted state of a browser allowed to skip the one-time code after a correct password.
 */
export interface TrustedDeviceProps {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identifier assigned when the device is trusted.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property accountId
   * @readonly
   *
   * @description
   * Account the trust was granted for; the device is ignored for any other account.
   *
   * @type {string}
   */
  readonly accountId: string;

  /**
   * Property tokenHash
   * @readonly
   *
   * @description
   * Hash of the opaque token kept in the device cookie; the bearer value itself is not persisted.
   *
   * @type {string}
   */
  readonly tokenHash: string;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Instant the right one-time code was entered with "trust this device".
   *
   * @type {Date}
   */
  readonly createdAt: Date;

  /**
   * Property expiresAt
   * @readonly
   *
   * @description
   * Instant from which the device is no longer trusted.
   *
   * @type {Date}
   */
  readonly expiresAt: Date;

  /**
   * Property lastUsedAt
   * @readonly
   *
   * @description
   * Last login that skipped the code thanks to this device, or `null` before the first one.
   *
   * @type {Date | null}
   */
  readonly lastUsedAt: Date | null;

  /**
   * Property revokedAt
   * @readonly
   *
   * @description
   * Revocation instant, or `null` while the trust stands.
   *
   * @type {Date | null}
   */
  readonly revokedAt: Date | null;
  // #endregion
}

/**
 * Class TrustedDevice
 * @class TrustedDevice
 *
 * @description
 * Browser trusted by one account to replace the one-time code (never the password) until its fixed
 * expiry or a revocation.
 */
export class TrustedDevice {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores device state created by `trust` or restored from persistence.
   *
   * @param {TrustedDeviceProps} props - Device state to retain.
   */
  private constructor(private readonly props: TrustedDeviceProps) {}
  // #endregion

  // #region Methods
  /**
   * Method trust
   * @method trust
   * @static
   *
   * @description
   * Creates a trusted device expiring `TRUSTED_DEVICE_TTL_MS` after `now`.
   *
   * @param {Pick<TrustedDeviceProps, 'id' | 'accountId' | 'tokenHash'>} input - Identity, owner and stored hash.
   * @param {Date} now - Creation time used as the lifetime origin.
   *
   * @returns {TrustedDevice} New device state.
   */
  public static trust(
    input: Pick<TrustedDeviceProps, 'id' | 'accountId' | 'tokenHash'>,
    now: Date,
  ): TrustedDevice {
    return new TrustedDevice({
      ...input,
      createdAt: now,
      expiresAt: new Date(now.getTime() + TRUSTED_DEVICE_TTL_MS),
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
   * Restores device state exactly as persisted.
   *
   * @param {TrustedDeviceProps} props - Persisted device state.
   *
   * @returns {TrustedDevice} Restored device.
   */
  public static rehydrate(props: TrustedDeviceProps): TrustedDevice {
    return new TrustedDevice(props);
  }

  /**
   * Method id
   * @method id
   *
   * @description
   * Returns the device identifier.
   *
   * @returns {string} Device identifier.
   */
  public get id(): string {
    return this.props.id;
  }

  /**
   * Method expiresAt
   * @method expiresAt
   *
   * @description
   * Returns the fixed expiry, also used as the device cookie expiry.
   *
   * @returns {Date} Device expiry.
   */
  public get expiresAt(): Date {
    return this.props.expiresAt;
  }

  /**
   * Method isTrustedFor
   * @method isTrustedFor
   *
   * @description
   * Accepts the device only for the account it was trusted for, while unrevoked and before its expiry
   * instant.
   *
   * @param {string} accountId - Account whose password was just verified.
   * @param {Date} now - Time against which expiry is evaluated.
   *
   * @returns {boolean} Whether the one-time code may be skipped.
   */
  public isTrustedFor(accountId: string, now: Date): boolean {
    return (
      this.props.accountId === accountId &&
      this.props.revokedAt === null &&
      this.props.expiresAt.getTime() > now.getTime()
    );
  }

  /**
   * Method used
   * @method used
   *
   * @description
   * Returns the state after a login that skipped the code; the expiry does not move.
   *
   * @param {Date} now - Login instant.
   *
   * @returns {TrustedDevice} Device with its last use recorded.
   */
  public used(now: Date): TrustedDevice {
    return new TrustedDevice({ ...this.props, lastUsedAt: now });
  }

  /**
   * Method snapshot
   * @method snapshot
   *
   * @description
   * Returns a shallow copy of device state for persistence.
   *
   * @returns {TrustedDeviceProps} Copy of the current state.
   */
  public snapshot(): TrustedDeviceProps {
    return { ...this.props };
  }
  // #endregion
}
