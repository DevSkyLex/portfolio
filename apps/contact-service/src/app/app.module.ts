import { type DynamicModule, Module } from '@nestjs/common';
import { AdminAuthModule } from '@vfortin/backend-auth';
import { ObservabilityModule } from '@vfortin/backend-observability';
import { ContactModule } from '@vfortin/contact-composition';
import type { ContactServiceConfig } from '@internal/contact-service/config';

/**
 * Class AppModule
 * @class AppModule
 *
 * @description
 * Composes contact persistence, admin token verification, observability and notification delivery for the service.
 */
@Module({})
export class AppModule {
  // #region Methods
  /**
   * Method forRoot
   * @method forRoot
   * @static
   *
   * @description
   * Creates the Nest dynamic module using validated settings and enables the contact background workers.
   *
   * @param {ContactServiceConfig} config - Validated environment settings for the contact service.
   * @returns {DynamicModule} Nest module metadata for the configured service.
   */
  public static forRoot(config: ContactServiceConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ObservabilityModule.forRoot({
          service: 'contact-service',
          level: config.LOG_LEVEL,
          pretty: config.NODE_ENV === 'development',
        }),
        AdminAuthModule.forRoot({ issuer: config.AUTH_ISSUER, jwksUrl: config.AUTH_JWKS_URL }),
        ContactModule.register({
          databaseUrl: config.CONTACT_DATABASE_URL,
          mail: {
            url: config.CONTACT_SMTP_URL,
            from: config.CONTACT_MAIL_FROM,
            to: config.CONTACT_NOTIFY_TO,
          },
          clientKeySecret: config.CONTACT_CLIENT_KEY_SECRET,
          workers: true,
        }),
      ],
    };
  }
  // #endregion
}
