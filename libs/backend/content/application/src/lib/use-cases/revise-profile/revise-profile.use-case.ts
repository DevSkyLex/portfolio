import { type Profile, type ProfileDraft, reviseProfile } from '@vfortin/content-domain';
import type {
  Clock,
  SiteTextsRepositories,
  SiteTextsUnitOfWork,
} from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Interface ProfileChangeResult
 * @interface ProfileChangeResult
 *
 * @description
 * Profile written by a revision, its new version and the queued site revision.
 */
export interface ProfileChangeResult {
  // #region Properties
  /**
   * Property profile
   * @readonly
   *
   * @description
   * Revised profile, carrying its new version.
   */
  readonly profile: Profile;

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Published-content revision whose rebuild was requested.
   */
  readonly revision: number;
  // #endregion
}

/**
 * Class ReviseProfile
 * @class ReviseProfile
 *
 * @description
 * Replaces the profile's texts, facts and links with optimistic locking and requests the site rebuild
 * in the same unit of work, since the profile is always public.
 */
export class ReviseProfile {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the transaction boundary and the request clock.
   *
   * @param {SiteTextsUnitOfWork} unitOfWork - Atomic profile and outbox writes.
   * @param {Clock} clock - Rebuild request time.
   */
  public constructor(
    private readonly unitOfWork: SiteTextsUnitOfWork,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Validates the draft (`reviseProfile`), then saves it if the profile still has `expectedVersion`.
   *
   * @param {number} expectedVersion - Version read before editing.
   * @param {ProfileDraft} draft - New content.
   * @throws {InvalidValueError} For an invalid field, before any write.
   * @throws {DomainError} `content.profile-incomplete` for a text missing in English.
   * @throws {VersionMismatchError} When the profile changed in the meantime.
   * @returns {Promise<ProfileChangeResult>} Revised profile and queued revision.
   */
  public async execute(expectedVersion: number, draft: ProfileDraft): Promise<ProfileChangeResult> {
    const revised: Profile = reviseProfile(draft, expectedVersion);
    return this.unitOfWork.run(
      async ({ profiles, buildRequests }: SiteTextsRepositories): Promise<ProfileChangeResult> => {
        const version: number = await profiles.save(revised, expectedVersion);
        return {
          profile: { ...revised, version },
          revision: await buildRequests.request(this.clock.now()),
        };
      },
    );
  }
  // #endregion
}
