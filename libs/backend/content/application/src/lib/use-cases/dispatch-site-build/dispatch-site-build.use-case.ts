import type {
  Clock,
  SiteBuildDispatcher,
  SiteBuildRequestRepository,
} from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Constant BUILD_LEASE_MS
 *
 * @description
 * Lease duration for a claimed rebuild request, long enough to keep concurrent workers from
 * dispatching the same outbox item while a workflow trigger is in flight.
 */
export const BUILD_LEASE_MS: number = 2 * 60 * 1000;

/**
 * Constant MAX_RETRY_DELAY_MS
 *
 * @description
 * Upper bound on exponential retry delay for a failed static-site workflow dispatch.
 */
const MAX_RETRY_DELAY_MS: number = 6 * 60 * 60 * 1000;

/**
 * Class DispatchSiteBuild
 * @class DispatchSiteBuild
 *
 * @description
 * Claims the latest pending rebuild request, dispatches it once, and schedules a bounded retry
 * when the external workflow trigger fails.
 */
export class DispatchSiteBuild {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the outbox, workflow dispatcher and clock used for leases and retry times.
   *
   * @param {SiteBuildRequestRepository} requests - Persistent lease and dispatch state.
   * @param {SiteBuildDispatcher} dispatcher - External workflow trigger.
   * @param {Clock} clock - Time source for deterministic lease and retry scheduling.
   */
  public constructor(
    private readonly requests: SiteBuildRequestRepository,
    private readonly dispatcher: SiteBuildDispatcher,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Sends the latest request and marks it dispatched. If dispatch or marking it dispatched fails, the
   * use case attempts to record a retry time and then rethrows the caught error; a failure while
   * recording the retry replaces that error. Returns `null` when no request can be claimed.
   *
   * @returns {Promise<{ dispatched: number | null }>} The completed revision, or `null` when idle.
   */
  public async execute(): Promise<{ dispatched: number | null }> {
    const now: Date = this.clock.now();
    const claimed: { revision: number; attempts: number } | null = await this.requests.claimLatest(
      now,
      new Date(now.getTime() + BUILD_LEASE_MS),
    );
    if (claimed === null) {
      return { dispatched: null };
    }
    try {
      await this.dispatcher.dispatch(claimed.revision);
      await this.requests.markDispatched(claimed.revision, this.clock.now());
      return { dispatched: claimed.revision };
    } catch (error: unknown) {
      const delay: number = Math.min(2 ** claimed.attempts * 60_000, MAX_RETRY_DELAY_MS);
      await this.requests.markFailed(
        claimed.revision,
        error instanceof Error ? error.message : String(error),
        new Date(this.clock.now().getTime() + delay),
      );
      throw error;
    }
  }
  // #endregion
}
