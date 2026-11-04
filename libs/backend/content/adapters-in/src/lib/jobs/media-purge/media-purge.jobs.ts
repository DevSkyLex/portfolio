import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PurgeMedia } from '@vfortin/content-application';

/**
 * Class MediaPurgeJobs
 * @class MediaPurgeJobs
 *
 * @description
 * Deletes, once a day, the media no project has referenced for seven days (D40).
 */
@Injectable()
export class MediaPurgeJobs {
  // #region Properties
  /**
   * Property logger
   * @readonly
   *
   * @description
   * Nest logger scoped to this scheduled job.
   */
  private readonly logger: Logger = new Logger(MediaPurgeJobs.name);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects the purge use case.
   *
   * @param {PurgeMedia} purge - Media purge use case.
   */
  public constructor(@Inject(PurgeMedia) private readonly purge: PurgeMedia) {}
  // #endregion

  // #region Methods
  /**
   * Method purgeUnlinked
   * @method purgeUnlinked
   *
   * @description
   * Runs the purge, logs the media deleted and logs failures for the next run.
   *
   * @returns {Promise<void>} Completion after the purge or its logged failure.
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  public async purgeUnlinked(): Promise<void> {
    try {
      const { purged } = await this.purge.execute();
      if (purged.length > 0) {
        this.logger.log(`Media purge: ${purged.length} media deleted (${purged.join(', ')})`);
      }
    } catch (error: unknown) {
      this.logger.error(error instanceof Error ? error.stack : String(error));
    }
  }
  // #endregion
}
