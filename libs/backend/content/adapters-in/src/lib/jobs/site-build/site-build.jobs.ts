import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DispatchSiteBuild } from '@vfortin/content-application';

/**
 * Constant SITE_BUILD_INTERVAL_MS
 *
 * @description
 * Polling interval used by Nest's scheduler to check for one pending site rebuild request.
 */
export const SITE_BUILD_INTERVAL_MS: 30000 = 30_000;

/**
 * Class SiteBuildJobs
 * @class SiteBuildJobs
 *
 * @description
 * Polls the rebuild outbox and logs workflow dispatch results while preventing overlapping runs.
 */
@Injectable()
export class SiteBuildJobs {
  // #region Properties
  /**
   * Property logger
   * @readonly
   *
   * @description
   * Nest logger scoped to this scheduled job.
   */
  private readonly logger: Logger = new Logger(SiteBuildJobs.name);

  /**
   * Property running
   *
   * @description
   * Guards the scheduled callback against overlapping dispatch attempts.
   */
  private running: boolean = false;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects the application worker that claims and dispatches rebuild requests.
   *
   * @param {DispatchSiteBuild} dispatch - Rebuild outbox use case.
   */
  public constructor(@Inject(DispatchSiteBuild) private readonly dispatch: DispatchSiteBuild) {}
  // #endregion

  // #region Methods
  /**
   * Method dispatchPending
   * @method dispatchPending
   *
   * @description
   * Processes one scheduled outbox claim, skips overlapping runs and logs failures for retry.
   *
   * @returns {Promise<void>} Completion after this poll attempt finishes.
   */
  @Interval(SITE_BUILD_INTERVAL_MS)
  public async dispatchPending(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const { dispatched } = await this.dispatch.execute();
      if (dispatched !== null) {
        this.logger.log(`Site rebuild triggered (revision ${dispatched})`);
      }
    } catch (error: unknown) {
      this.logger.warn(`Rebuild not triggered, retrying later: ${String(error)}`);
    } finally {
      this.running = false;
    }
  }
  // #endregion
}
