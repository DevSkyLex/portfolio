import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminOnly } from '@vfortin/backend-auth';
import { ZodValidationPipe } from '@vfortin/backend-http';
import {
  ApproveAuthorizationRequest,
  type AuthorizationReview,
  DenyAuthorizationRequest,
  ReviewAuthorizationRequest,
} from '@vfortin/identity-application';
import {
  type AdminClaims,
  type AuthorizationRedirect,
  type AuthorizationReviewRequest,
  AuthorizationReviewRequestSchema,
  type AuthorizationReviewResponse,
  IDENTITY_ERROR_CODES,
} from '@vfortin/identity-contracts';
import {
  type AuthorizationRequestProps,
  OAuthError,
  hostOf,
  isLoopbackRedirect,
} from '@vfortin/identity-domain';
import type { Request } from 'express';
import { toAuthorizationParameters } from '@internal/identity-adapters-in/lib/http/mappers/oauth-parameters/oauth-parameters.mapper';

/**
 * Function claimsOf
 *
 * @description
 * Reads the administrator claims `AdminGuard` attached to the request.
 *
 * @param {Request} request - Guarded request.
 *
 * @returns {AdminClaims} Subject, role and session.
 *
 * @throws {UnauthorizedException} When the guard did not run.
 */
export function claimsOf(request: Request): AdminClaims {
  const claims: AdminClaims | undefined = (request as Request & { admin?: AdminClaims }).admin;
  if (claims === undefined) {
    throw new UnauthorizedException({
      code: IDENTITY_ERROR_CODES.unauthorized,
      message: 'Administrator authentication required.',
    });
  }
  return claims;
}

/**
 * Function toReviewResponse
 *
 * @description
 * Presents a review: the consent screen data, or the error redirect.
 *
 * @param {AuthorizationReview} review - Use-case outcome.
 *
 * @returns {AuthorizationReviewResponse} Response body.
 */
function toReviewResponse(review: AuthorizationReview): AuthorizationReviewResponse {
  if (review.kind === 'redirect') {
    return { status: 'redirect', redirectTo: review.redirectTo };
  }
  const values: AuthorizationRequestProps = review.request.values;
  return {
    status: 'consent',
    requestId: values.id,
    expiresIn: Math.round((values.expiresAt.getTime() - values.createdAt.getTime()) / 1000),
    client: {
      clientId: review.client.id,
      name: review.client.name,
      clientUri: review.client.clientUri,
      logo: review.client.logo,
      registration: review.client.kind,
    },
    redirectUri: values.redirectUri,
    redirectHost: hostOf(values.redirectUri),
    loopbackRedirect: isLoopbackRedirect(values.redirectUri),
    scopes: [...values.scopes],
    grantedScopes: [...review.grantedScopes],
    resource: values.resource,
  };
}

/**
 * Class OAuthConsentController
 * @class OAuthConsentController
 *
 * @description
 * Administrator side of the authorization endpoint (D45). The consent page at
 * `/admin/oauth/authorize` forwards the query here once the owner is signed in, shows the answer,
 * then posts the decision; the browser follows the returned redirect itself (`location.assign`),
 * so no form posts to the client and the CSP `form-action 'self'` stays. Bearer-authenticated
 * (`@AdminOnly`, the session `sid` binds the request), hence immune to cross-site forgery; the page
 * is never framed (`frame-ancestors 'none'`).
 */
@Controller('auth/admin/oauth/authorizations')
@AdminOnly()
export class OAuthConsentController {
  // #region Properties
  /**
   * Property logger
   * @readonly
   *
   * @description
   * Records refused requests by protocol code, never with their parameters.
   *
   * @type {Logger}
   */
  private readonly logger: Logger = new Logger(OAuthConsentController.name);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects the review and decision use cases.
   *
   * @param {ReviewAuthorizationRequest} reviewUseCase - Validation and pending request.
   * @param {ApproveAuthorizationRequest} approveUseCase - « Autoriser ».
   * @param {DenyAuthorizationRequest} denyUseCase - « Refuser ».
   */
  public constructor(
    @Inject(ReviewAuthorizationRequest) private readonly reviewUseCase: ReviewAuthorizationRequest,
    @Inject(ApproveAuthorizationRequest)
    private readonly approveUseCase: ApproveAuthorizationRequest,
    @Inject(DenyAuthorizationRequest) private readonly denyUseCase: DenyAuthorizationRequest,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method review
   * @method review
   *
   * @description
   * Validates the forwarded authorization request. A request that cannot go back to its client
   * answers 400 problem+json (unknown client, unregistered redirect URI, no client identifier).
   *
   * @param {AuthorizationReviewRequest} body - Forwarded query.
   * @param {Request} request - Guarded request.
   *
   * @returns {Promise<AuthorizationReviewResponse>} Consent or error redirect.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  public async review(
    @Body(new ZodValidationPipe(AuthorizationReviewRequestSchema)) body: AuthorizationReviewRequest,
    @Req() request: Request,
  ): Promise<AuthorizationReviewResponse> {
    const claims: AdminClaims = claimsOf(request);
    try {
      return toReviewResponse(
        await this.reviewUseCase.execute({
          accountId: claims.sub,
          sessionId: claims.sid,
          parameters: toAuthorizationParameters(body),
        }),
      );
    } catch (error: unknown) {
      if (error instanceof OAuthError) {
        this.logger.warn(`Authorization request refused (${error.error})`);
      }
      throw error;
    }
  }

  /**
   * Method approve
   * @method approve
   *
   * @description
   * « Autoriser »: issues the code and returns the redirect back to the client.
   *
   * @param {string} id - Pending request.
   * @param {Request} request - Guarded request.
   *
   * @returns {Promise<AuthorizationRedirect>} Redirect with `code`, `state` and `iss`.
   */
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  public async approve(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<AuthorizationRedirect> {
    const claims: AdminClaims = claimsOf(request);
    return {
      status: 'redirect',
      redirectTo: await this.approveUseCase.execute({
        requestId: id,
        accountId: claims.sub,
        sessionId: claims.sid,
      }),
    };
  }

  /**
   * Method deny
   * @method deny
   *
   * @description
   * « Refuser »: returns the `access_denied` redirect back to the client.
   *
   * @param {string} id - Pending request.
   * @param {Request} request - Guarded request.
   *
   * @returns {Promise<AuthorizationRedirect>} Error redirect with `state` and `iss`.
   */
  @Post(':id/deny')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  public async deny(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<AuthorizationRedirect> {
    const claims: AdminClaims = claimsOf(request);
    return {
      status: 'redirect',
      redirectTo: await this.denyUseCase.execute({
        requestId: id,
        accountId: claims.sub,
        sessionId: claims.sid,
      }),
    };
  }
  // #endregion
}
