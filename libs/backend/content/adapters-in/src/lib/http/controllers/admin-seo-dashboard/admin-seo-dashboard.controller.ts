import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { AdminOnly } from '@vfortin/backend-auth';
import { ZodValidationPipe } from '@vfortin/backend-http';
import {
  GetSeoDashboard,
  RefreshSeoDashboard,
  SEO_REFRESH_INTERVAL_MS,
  SeoRefreshTooSoonError,
  type SeoRefreshSummary,
  type SeoRefreshTicket,
} from '@vfortin/content-application';
import {
  SEO_DASHBOARD_DEFAULT_RANGE,
  type SeoDashboardDto,
  type SeoDashboardQuery,
  SeoDashboardQuerySchema,
  type SeoRefreshAcceptedDto,
} from '@vfortin/content-contracts';
import type { Response } from 'express';
import {
  summaryLine,
  toSeoDashboardDto,
} from '@internal/content-adapters-in/lib/http/presenters/seo-dashboard/seo-dashboard.presenter';

/**
 * Class AdminSeoDashboardController
 * @class AdminSeoDashboardController
 *
 * @description
 * SEO dashboard of the administration (D47) under `/api/content/admin/seo/dashboard`. The read
 * serves the cache and the internal audit, never calling Google; the refresh starts in the
 * background and answers 202. `@AdminOnly` runs before the pipes, so an anonymous call is answered
 * 401 whatever its query.
 */
@Controller('content/admin/seo/dashboard')
@AdminOnly()
export class AdminSeoDashboardController {
  // #region Properties
  /**
   * Property logger
   * @readonly
   *
   * @description
   * Logger of the background refreshes.
   */
  private readonly logger: Logger = new Logger('SeoDashboard');
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects the dashboard query and the refresh.
   *
   * @param {GetSeoDashboard} dashboard - Reads the dashboard.
   * @param {RefreshSeoDashboard} refreshDashboard - Refreshes the Google sections.
   */
  public constructor(
    @Inject(GetSeoDashboard) private readonly dashboard: GetSeoDashboard,
    @Inject(RefreshSeoDashboard) private readonly refreshDashboard: RefreshSeoDashboard,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method get
   * @method get
   *
   * @description
   * Returns the dashboard of the requested range, `28d` by default.
   *
   * @param {SeoDashboardQuery} query - Validated query.
   * @returns {Promise<SeoDashboardDto>} Dashboard.
   */
  @Get()
  @Header('Cache-Control', 'no-store')
  public async get(
    @Query(new ZodValidationPipe(SeoDashboardQuerySchema)) query: SeoDashboardQuery,
  ): Promise<SeoDashboardDto> {
    return toSeoDashboardDto(
      await this.dashboard.execute(query.range ?? SEO_DASHBOARD_DEFAULT_RANGE),
    );
  }

  /**
   * Method refresh
   * @method refresh
   *
   * @description
   * Starts a refresh and answers 202 at once: Google takes longer than the edge's 30-second proxy
   * timeout. Within 10 minutes of the previous start it answers 429 with `Retry-After` (an HTTP
   * date). The outcome is logged once the refresh ends.
   *
   * @param {Response} response - Response receiving `Retry-After` on a refusal.
   * @returns {Promise<SeoRefreshAcceptedDto>} Start and earliest next refresh.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.ACCEPTED)
  @Header('Cache-Control', 'no-store')
  public async refresh(
    @Res({ passthrough: true }) response: Response,
  ): Promise<SeoRefreshAcceptedDto> {
    let ticket: SeoRefreshTicket;
    try {
      ticket = await this.refreshDashboard.start();
    } catch (error: unknown) {
      if (error instanceof SeoRefreshTooSoonError) {
        response.setHeader('Retry-After', error.retryAt.toUTCString());
      }
      throw error;
    }
    ticket.completion.then(
      (summary: SeoRefreshSummary): void => this.logger.log(summaryLine(summary)),
      (error: unknown): void =>
        this.logger.error(error instanceof Error ? error.stack : String(error)),
    );
    return {
      startedAt: ticket.startedAt.toISOString(),
      nextAllowedAt: new Date(ticket.startedAt.getTime() + SEO_REFRESH_INTERVAL_MS).toISOString(),
    };
  }
  // #endregion
}
