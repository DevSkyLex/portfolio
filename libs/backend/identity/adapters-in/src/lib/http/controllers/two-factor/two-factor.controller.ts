import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminOnly } from '@vfortin/backend-auth';
import { ZodValidationPipe } from '@vfortin/backend-http';
import {
  DisableTwoFactor,
  EnableTwoFactor,
  GetTwoFactorStatus,
  PasswordMismatchError,
  StartTwoFactorSetup,
  TotpInvalidError,
} from '@vfortin/identity-application';
import {
  type AdminClaims,
  IDENTITY_ERROR_CODES,
  type TwoFactorDisableRequest,
  TwoFactorDisableRequestSchema,
  type TwoFactorEnableRequest,
  TwoFactorEnableRequestSchema,
  type TwoFactorSetupRequest,
  TwoFactorSetupRequestSchema,
  type TwoFactorSetupResponse,
  type TwoFactorStatusResponse,
} from '@vfortin/identity-contracts';
import { AccountLockedError } from '@vfortin/identity-domain';
import type { Request } from 'express';

/**
 * Class TwoFactorController
 * @class TwoFactorController
 *
 * @description
 * Administrator routes of the optional one-time code (D17): status, enrollment start and confirmation,
 * removal. Bearer-authenticated by `@AdminOnly` (no cookie, so no anti-CSRF header); a wrong password or
 * code answers 422 and a state conflict 409, never 401, so that the admin client keeps its session. Every
 * success is `no-store`, the setup answer being the only response that ever carries a secret.
 */
@Controller('auth/totp')
@AdminOnly()
export class TwoFactorController {
  // #region Properties
  /**
   * Property logger
   * @readonly
   *
   * @description
   * Nest logger recording refusals by code, never with the submitted values or a secret.
   *
   * @type {Logger}
   */
  private readonly logger: Logger = new Logger(TwoFactorController.name);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects the second-factor use cases.
   *
   * @param {GetTwoFactorStatus} statusUseCase - State read.
   * @param {StartTwoFactorSetup} setupUseCase - Enrollment start.
   * @param {EnableTwoFactor} enableUseCase - Enrollment confirmation.
   * @param {DisableTwoFactor} disableUseCase - Removal.
   */
  public constructor(
    @Inject(GetTwoFactorStatus) private readonly statusUseCase: GetTwoFactorStatus,
    @Inject(StartTwoFactorSetup) private readonly setupUseCase: StartTwoFactorSetup,
    @Inject(EnableTwoFactor) private readonly enableUseCase: EnableTwoFactor,
    @Inject(DisableTwoFactor) private readonly disableUseCase: DisableTwoFactor,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method status
   * @method status
   *
   * @description
   * Tells whether the login of the signed-in administrator asks for a one-time code.
   *
   * @param {Request} request - Request carrying the verified claims.
   *
   * @returns {Promise<TwoFactorStatusResponse>} Current state.
   */
  @Get()
  @Header('Cache-Control', 'no-store')
  public async status(@Req() request: Request): Promise<TwoFactorStatusResponse> {
    return this.statusUseCase.execute(this.accountId(request));
  }

  /**
   * Method setup
   * @method setup
   *
   * @description
   * Checks the password and returns a new pending secret with its `otpauth://` URI.
   *
   * @param {TwoFactorSetupRequest} body - Validated password confirmation.
   * @param {Request} request - Request carrying the verified claims.
   *
   * @returns {Promise<TwoFactorSetupResponse>} Pending secret and provisioning URI.
   */
  @Post('setup')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  public async setup(
    @Body(new ZodValidationPipe(TwoFactorSetupRequestSchema)) body: TwoFactorSetupRequest,
    @Req() request: Request,
  ): Promise<TwoFactorSetupResponse> {
    try {
      const { secret, provisioningUri } = await this.setupUseCase.execute({
        accountId: this.accountId(request),
        password: body.password,
      });
      return { secret, provisioningUri };
    } catch (error: unknown) {
      this.logRefusal('Second-factor setup refused', error);
      throw error;
    }
  }

  /**
   * Method enable
   * @method enable
   *
   * @description
   * Confirms the enrollment with a code of the pending secret.
   *
   * @param {TwoFactorEnableRequest} body - Validated code.
   * @param {Request} request - Request carrying the verified claims.
   *
   * @returns {Promise<TwoFactorStatusResponse>} `{ enabled: true }`.
   */
  @Post('enable')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  public async enable(
    @Body(new ZodValidationPipe(TwoFactorEnableRequestSchema)) body: TwoFactorEnableRequest,
    @Req() request: Request,
  ): Promise<TwoFactorStatusResponse> {
    try {
      await this.enableUseCase.execute({ accountId: this.accountId(request), totp: body.totp });
      return { enabled: true };
    } catch (error: unknown) {
      this.logRefusal('Second-factor confirmation refused', error);
      throw error;
    }
  }

  /**
   * Method disable
   * @method disable
   *
   * @description
   * Turns the code off with the password and a current code; the trusted devices are forgotten.
   *
   * @param {TwoFactorDisableRequest} body - Validated password and code.
   * @param {Request} request - Request carrying the verified claims.
   *
   * @returns {Promise<TwoFactorStatusResponse>} `{ enabled: false }`.
   */
  @Post('disable')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  public async disable(
    @Body(new ZodValidationPipe(TwoFactorDisableRequestSchema)) body: TwoFactorDisableRequest,
    @Req() request: Request,
  ): Promise<TwoFactorStatusResponse> {
    try {
      await this.disableUseCase.execute({
        accountId: this.accountId(request),
        password: body.password,
        totp: body.totp,
      });
      return { enabled: false };
    } catch (error: unknown) {
      this.logRefusal('Second-factor removal refused', error);
      throw error;
    }
  }

  /**
   * Method accountId
   * @method accountId
   *
   * @description
   * Reads the subject that `AdminGuard` attached to the request after verifying the bearer token.
   *
   * @param {Request} request - Guarded request.
   *
   * @returns {string} Account identifier.
   *
   * @throws {UnauthorizedException} When no claims are attached (guard not applied).
   */
  private accountId(request: Request): string {
    const claims: AdminClaims | undefined = (request as Request & { admin?: AdminClaims }).admin;
    if (claims === undefined) {
      throw new UnauthorizedException({
        code: IDENTITY_ERROR_CODES.unauthorized,
        message: 'Administrator authentication required.',
      });
    }
    return claims.sub;
  }

  /**
   * Method logRefusal
   * @method logRefusal
   *
   * @description
   * Logs a credential refusal by its code only; other errors are left to the problem filter.
   *
   * @param {string} label - Route that refused.
   * @param {unknown} error - Error thrown by the use case.
   *
   * @returns {void} Completes after logging.
   */
  private logRefusal(label: string, error: unknown): void {
    if (
      error instanceof PasswordMismatchError ||
      error instanceof TotpInvalidError ||
      error instanceof AccountLockedError
    ) {
      this.logger.warn(`${label} (${error.code})`);
    }
  }
  // #endregion
}
