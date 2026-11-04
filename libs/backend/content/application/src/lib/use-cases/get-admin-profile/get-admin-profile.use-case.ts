import type { Profile } from '@vfortin/content-domain';
import type { ProfileRepository } from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Class GetAdminProfile
 * @class GetAdminProfile
 *
 * @description
 * Loads the profile (« Informations ») for the administration editor.
 */
export class GetAdminProfile {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the profile repository.
   *
   * @param {ProfileRepository} profiles - Singleton profile.
   */
  public constructor(private readonly profiles: ProfileRepository) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Returns the stored profile with its version.
   *
   * @returns {Promise<Profile>} Profile.
   */
  public execute(): Promise<Profile> {
    return this.profiles.load();
  }
  // #endregion
}
