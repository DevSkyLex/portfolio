import { AdminAccount, assertPasswordPolicy } from '@vfortin/identity-domain';
import { AlreadyBootstrappedError } from '@internal/identity-application/lib/errors/application-error';
import type {
  AdminAccountRepository,
  IdGenerator,
  PasswordHasher,
  TotpVerifier,
} from '@internal/identity-application/lib/ports/identity/identity.ports';

/**
 * Interface BootstrapResult
 * @interface BootstrapResult
 *
 * @description
 * Credentials and authenticator enrollment data returned once when the administrator account is created.
 */
export interface BootstrapResult {
  // #region Properties
  /**
   * Property email
   * @readonly
   *
   * @description
   * Normalized address stored on the newly created account.
   *
   * @type {string}
   */
  readonly email: string;

  /**
   * Property totpSecret
   * @readonly
   *
   * @description
   * Base32 secret that must be enrolled in the administrator's authenticator.
   *
   * @type {string}
   */
  readonly totpSecret: string;

  /**
   * Property provisioningUri
   * @readonly
   *
   * @description
   * `otpauth://` URI that can be encoded as a QR code for authenticator enrollment.
   *
   * @type {string}
   */
  readonly provisioningUri: string;
  // #endregion
}

/**
 * Class BootstrapAdmin
 * @class BootstrapAdmin
 *
 * @description
 * Creates the site's single administrator account through an operations command; public sign-up is not provided.
 */
export class BootstrapAdmin {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Supplies the account repository and credential enrollment services used for the one-time bootstrap.
   *
   * @param {AdminAccountRepository} accounts - Repository used to enforce the single-account invariant and persist the account.
   * @param {PasswordHasher} hasher - Password hashing service.
   * @param {TotpVerifier} totp - Secret generation and enrollment URI service.
   * @param {IdGenerator} ids - Account identifier generator.
   */
  public constructor(
    private readonly accounts: AdminAccountRepository,
    private readonly hasher: PasswordHasher,
    private readonly totp: TotpVerifier,
    private readonly ids: IdGenerator,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Refuses bootstrap when an account exists, enforces password policy, then persists hashed credentials and returns TOTP enrollment material. A failed repository write rejects the promise.
   *
   * @param {string} email - Initial administrator email address.
   * @param {string} password - Initial plain password checked against the domain policy before hashing.
   *
   * @returns {Promise<BootstrapResult>} Normalized address, generated secret and authenticator provisioning URI.
   */
  public async execute(email: string, password: string): Promise<BootstrapResult> {
    if ((await this.accounts.count()) > 0) {
      throw new AlreadyBootstrappedError();
    }
    assertPasswordPolicy(password);
    const totpSecret: string = this.totp.generateSecret();
    const account: AdminAccount = AdminAccount.create({
      id: this.ids.next(),
      email,
      passwordHash: await this.hasher.hash(password),
      totpSecret,
    });
    await this.accounts.add(account);
    return {
      email: account.email,
      totpSecret,
      provisioningUri: this.totp.provisioningUri(totpSecret, account.email),
    };
  }
  // #endregion
}
