import { Controller, Get, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  HealthCheck,
  type HealthCheckResult,
  HealthCheckService,
  type HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import {
  READINESS_CHECKS,
  type ReadinessCheck,
} from '@internal/backend-observability/lib/readiness/readiness';

/**
 * Class HealthController
 * @class HealthController
 *
 * @description
 * Exposes process liveness and dependency readiness endpoints for service orchestration.
 */
@Controller('health')
export class HealthController {
  // #region Properties
  /**
   * Property logger
   * @readonly
   *
   * @description
   * Records dependency probe failures while keeping infrastructure details out of probe responses.
   *
   * @type {Logger}
   */
  private readonly logger: Logger = new Logger(HealthController.name);

  /**
   * Property checks
   *
   * @description
   * Cached readiness providers resolved from Nest once; `null` means resolution has not yet been attempted.
   *
   * @type {readonly ReadinessCheck[] | null}
   */
  private checks: readonly ReadinessCheck[] | null = null;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives Terminus health services and the module reference used to resolve optional readiness providers.
   *
   * @param {HealthCheckService} health - Terminus service that executes health indicators.
   * @param {HealthIndicatorService} indicators - Creates named up/down indicator results.
   * @param {ModuleRef} moduleRef - Resolves the optional composition-provided readiness list.
   */
  public constructor(
    private readonly health: HealthCheckService,
    private readonly indicators: HealthIndicatorService,
    private readonly moduleRef: ModuleRef,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method live
   * @method live
   *
   * @description
   * Reports process liveness without checking external dependencies.
   *
   * @returns {Promise<HealthCheckResult>} Successful liveness result while the controller can respond.
   */
  @Get('live')
  @HealthCheck()
  public live(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  /**
   * Method ready
   * @method ready
   *
   * @description
   * Runs each declared dependency probe and returns a failing health response if any probe rejects.
   * Failure causes are logged but omitted from indicator details.
   *
   * @returns {Promise<HealthCheckResult>} Aggregate readiness result consumed by the load balancer.
   */
  @Get('ready')
  @HealthCheck()
  public ready(): Promise<HealthCheckResult> {
    return this.health.check(
      this.readinessChecks().map(
        (dependency: ReadinessCheck): (() => Promise<HealthIndicatorResult>) =>
          async (): Promise<HealthIndicatorResult> => {
            const indicator: ReturnType<HealthIndicatorService['check']> = this.indicators.check(
              dependency.name,
            );
            try {
              await dependency.check();
              return indicator.up();
            } catch (error: unknown) {
              // The cause stays in the logs: the probe response does not describe the infrastructure.
              this.logger.warn(`${dependency.name} unavailable: ${String(error)}`);
              return indicator.down();
            }
          },
      ),
    );
  }

  /**
   * Method readinessChecks
   * @method readinessChecks
   *
   * @description
   * Resolves the optional composition token once and caches an empty list when no provider is registered.
   *
   * @returns {readonly ReadinessCheck[]} Dependency probes to execute for readiness.
   */
  private readinessChecks(): readonly ReadinessCheck[] {
    if (this.checks === null) {
      try {
        this.checks = this.moduleRef.get<readonly ReadinessCheck[]>(READINESS_CHECKS, {
          strict: false,
        });
      } catch {
        this.checks = [];
      }
    }
    return this.checks;
  }
  // #endregion
}
