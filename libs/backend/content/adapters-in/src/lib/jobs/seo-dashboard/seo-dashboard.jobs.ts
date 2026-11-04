import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RefreshSeoDashboard, SeoRefreshTooSoonError } from '@vfortin/content-application';
import { summaryLine } from '@internal/content-adapters-in/lib/http/presenters/seo-dashboard/seo-dashboard.presenter';

/**
 * Class SeoDashboardJobs
 * @class SeoDashboardJobs
 *
 * @description
 * Refreshes the Google sections of the SEO dashboard once a day (D47), at 05:30 server time: Search
 * Console and GA4 publish a day's figures with a delay of one to three days, so a daily refresh
 * shows every new day.
 */
@Injectable()
export class SeoDashboardJobs {
  // #region Properties
  /**
   * Property logger
   * @readonly
   *
   * @description
   * Nest logger scoped to this scheduled job.
   */
  private readonly logger: Logger = new Logger(SeoDashboardJobs.name);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects the refresh use case.
   *
   * @param {RefreshSeoDashboard} refresh - Refresh of the Google sections.
   */
  public constructor(@Inject(RefreshSeoDashboard) private readonly refresh: RefreshSeoDashboard) {}
  // #endregion

  // #region Methods
  /**
   * Method refreshDaily
   * @method refreshDaily
   *
   * @description
   * Runs a refresh to its end and logs its outcome; one started manually less than 10 minutes before
   * makes this run unnecessary, and other failures are logged for the next day.
   *
   * @returns {Promise<void>} Completion after the refresh or its logged failure.
   */
  @Cron('0 30 5 * * *')
  public async refreshDaily(): Promise<void> {
    try {
      this.logger.log(summaryLine(await (await this.refresh.start()).completion));
    } catch (error: unknown) {
      if (error instanceof SeoRefreshTooSoonError) {
        this.logger.log('SEO dashboard refresh skipped: one ran less than 10 minutes ago.');
        return;
      }
      this.logger.error(error instanceof Error ? error.stack : String(error));
    }
  }
  // #endregion
}
