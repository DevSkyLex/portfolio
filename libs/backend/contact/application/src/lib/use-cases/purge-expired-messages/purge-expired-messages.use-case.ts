import type {
  Clock,
  ContactMessageRepository,
  RateLimiter,
} from '@internal/contact-application/lib/ports/contact/contact.ports';

/**
 * Class PurgeExpiredMessages
 * @class PurgeExpiredMessages
 *
 * @description
 * Removes expired messages and rate-limit windows using one shared clock instant.
 */
export class PurgeExpiredMessages {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the repositories and clock used by the scheduled retention cleanup.
   * @param {ContactMessageRepository} messages - Repository that removes messages and related notifications.
   * @param {RateLimiter} rateLimiter - Repository that removes expired request counters.
   * @param {Clock} clock - Source of the cleanup instant.
   */
  public constructor(
    private readonly messages: ContactMessageRepository,
    private readonly rateLimiter: RateLimiter,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Deletes messages whose retention deadline has elapsed, then purges finished rate-limit windows.
   * @returns {Promise<{ deleted: number }>} Number of messages removed; rate-window count is not exposed.
   */
  public async execute(): Promise<{ deleted: number }> {
    const now: Date = this.clock.now();
    const deleted: number = await this.messages.deleteExpired(now);
    await this.rateLimiter.purgeExpired(now);
    return { deleted };
  }
  // #endregion
}
