import { AdminAccount, assertPasswordPolicy } from '@vfortin/identity-domain';
import { AlreadyBootstrappedError } from '@internal/identity-application/lib/errors/application-error';
import type {
  AdminAccountRepository,
  IdGenerator,
  PasswordHasher,
} from '@internal/identity-application/lib/ports/identity/identity.ports';

/**
 * Interface BootstrapResult
 * @interface BootstrapResult
 *
 * @description
 * Outcome of the one-time account creation; no secret is produced, the second factor being enrolled
 * later from the admin (D17).
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
  // #endregion
}

/**
 * Class BootstrapAdmin
 * @class BootstrapAdmin
 *
 * @description
 * Creates the site's single administrator account through an operations command, with the password only;
 * public sign-up is not provided.
 */
export class BootstrapAdmin {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Supplies the account repository and credential services used for the one-time bootstrap.
   *
   * @param {AdminAccountRepository} accounts - Repository used to enforce the single-account invariant and persist the account.
   * @param {PasswordHasher} hasher - Password hashing service.
   * @param {IdGenerator} ids - Account identifier generator.
   */
  public constructor(
    private readonly accounts: AdminAccountRepository,
    private readonly hasher: PasswordHasher,
    private readonly ids: IdGenerator,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Refuses bootstrap when an account exists, enforces password policy, then persists the hashed password with the second factor off. A failed repository write rejects the promise.
   *
   * @param {string} email - Initial administrator email address.
   * @param {string} password - Initial plain password checked against the domain policy before hashing.
   *
   * @returns {Promise<BootstrapResult>} Normalized address of the new account.
   */
  public async execute(email: string, password: string): Promise<BootstrapResult> {
    if ((await this.accounts.count()) > 0) {
      throw new AlreadyBootstrappedError();
    }
    assertPasswordPolicy(password);
    const account: AdminAccount = AdminAccount.create({
      id: this.ids.next(),
      email,
      passwordHash: await this.hasher.hash(password),
    });
    await this.accounts.add(account);
    return { email: account.email };
  }
  // #endregion
}
