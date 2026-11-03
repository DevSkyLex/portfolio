import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { ZodValidationPipe } from '@vfortin/backend-http';
import { SubmitContactMessage } from '@vfortin/contact-application';
import {
  type ContactMessageAccepted,
  type ContactMessageRequest,
  ContactMessageRequestSchema,
} from '@vfortin/contact-contracts';
import type { Request } from 'express';
import { createHmac } from 'node:crypto';

/**
 * Interface ContactHttpOptions
 * @interface ContactHttpOptions
 *
 * @description
 * Secret configuration used to derive privacy-preserving request-origin fingerprints.
 */
export interface ContactHttpOptions {
  // #region Properties
  /**
   * Property clientKeySecret
   * @readonly
   *
   * @description
   * HMAC key used to fingerprint the request origin without storing its clear IP address.
   *
   * @type {string}
   */
  readonly clientKeySecret: string;
  // #endregion
}

/**
 * Constant CONTACT_HTTP_OPTIONS
 * @readonly
 *
 * @description
 * Nest token for the contact HTTP origin-fingerprint configuration.
 */
export const CONTACT_HTTP_OPTIONS: unique symbol = Symbol('CONTACT_HTTP_OPTIONS');

/**
 * Constant RECEIVED
 * @readonly
 *
 * @description
 * Uniform accepted response shared by persisted submissions and honeypot requests.
 *
 * @type {ContactMessageAccepted}
 */
const RECEIVED: ContactMessageAccepted = { status: 'received' };

/**
 * Class ContactController
 * @class ContactController
 *
 * @description
 * Accepts validated public contact submissions and applies the privacy-preserving origin rate limit.
 */
@Controller('contact')
export class ContactController {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the submission use case and secret used to fingerprint request origins.
   * @param {SubmitContactMessage} submitMessage - Use case that validates and persists a submission.
   * @param {ContactHttpOptions} options - Secret configuration for the origin fingerprint.
   */
  public constructor(
    @Inject(SubmitContactMessage) private readonly submitMessage: SubmitContactMessage,
    @Inject(CONTACT_HTTP_OPTIONS) private readonly options: ContactHttpOptions,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Accepts a contract-validated message with HTTP 202; a filled honeypot receives the same response without persistence.
   * @param {ContactMessageRequest} body - Validated contact form payload.
   * @param {Request} request - Express request whose IP is converted to an HMAC fingerprint.
   * @returns {Promise<ContactMessageAccepted>} Accepted response body.
   */
  @Post('messages')
  @HttpCode(HttpStatus.ACCEPTED)
  public async submit(
    @Body(new ZodValidationPipe(ContactMessageRequestSchema)) body: ContactMessageRequest,
    @Req() request: Request,
  ): Promise<ContactMessageAccepted> {
    // Honeypot field filled in: a bot. Same response as a success, nothing is saved.
    if (body.website) {
      return RECEIVED;
    }
    await this.submitMessage.execute({
      name: body.name,
      company: body.company ?? null,
      email: body.email,
      subject: body.subject,
      body: body.message,
      locale: body.locale,
      clientKey: createHmac('sha256', this.options.clientKeySecret)
        .update(request.ip ?? 'unknown')
        .digest('hex'),
    });
    return RECEIVED;
  }
  // #endregion
}
