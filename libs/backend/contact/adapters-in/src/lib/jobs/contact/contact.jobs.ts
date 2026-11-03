import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import {
  DeliverPendingNotifications,
  PurgeExpiredMessages,
  type DeliveryReport,
} from '@vfortin/contact-application';

/**
 * Constant DELIVERY_INTERVAL_MS
 * @readonly
 *
 * @description
 * Interval between notification outbox worker runs, in milliseconds.
 *
 * @type {number}
 */
export const DELIVERY_INTERVAL_MS: number = 15_000;

/**
 * Class ContactJobs
 * @class ContactJobs
 *
 * @description
 * Runs scheduled notification delivery and retention cleanup tasks for the contact service.
 */
@Injectable()
export class ContactJobs {
  // #region Properties
  /**
   * Property logger
   * @readonly
   *
   * @description
   * Nest logger named for this scheduled task provider.
   *
   * @type {Logger}
   */
  private readonly logger: Logger = new Logger(ContactJobs.name);

  /**
   * Property delivering
   *
   * @description
   * Prevents overlapping delivery intervals within this process; database leases coordinate across instances.
   *
   * @type {boolean}
   */
  private delivering: boolean = false;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the scheduled delivery and expiry-purge use cases.
   * @param {DeliverPendingNotifications} deliver - Outbox delivery use case.
   * @param {PurgeExpiredMessages} purge - Retention cleanup use case.
   */
  public constructor(
    @Inject(DeliverPendingNotifications) private readonly deliver: DeliverPendingNotifications,
    @Inject(PurgeExpiredMessages) private readonly purge: PurgeExpiredMessages,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method deliverNotifications
   * @method deliverNotifications
   *
   * @description
   * Claims and sends due notifications, logs non-empty results and catches worker failures for the next interval.
   * @returns {Promise<void>} Completion after the worker run or its logged failure.
   */
  @Interval(DELIVERY_INTERVAL_MS)
  public async deliverNotifications(): Promise<void> {
    // One run at a time in this process; across instances, the claim in the database takes care of it.
    if (this.delivering) {
      return;
    }
    this.delivering = true;
    try {
      const report: DeliveryReport = await this.deliver.execute();
      if (report.sent + report.failed > 0) {
        this.logger.log(
          `Notifications: ${report.sent} sent, ${report.failed} failed, ${report.lost} lease(s) lost`,
        );
      }
    } catch (error: unknown) {
      this.logger.error(error instanceof Error ? error.stack : String(error));
    } finally {
      this.delivering = false;
    }
  }

  /**
   * Method purgeExpired
   * @method purgeExpired
   *
   * @description
   * Removes expired contact records once daily and logs the deletion count; failures are logged for later retry.
   * @returns {Promise<void>} Completion after cleanup or its logged failure.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  public async purgeExpired(): Promise<void> {
    try {
      const { deleted } = await this.purge.execute();
      this.logger.log(`Purge: ${deleted} message(s) deleted`);
    } catch (error: unknown) {
      this.logger.error(error instanceof Error ? error.stack : String(error));
    }
  }
  // #endregion
}
