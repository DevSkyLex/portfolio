import { type DynamicModule, Module } from '@nestjs/common';
import { AdminAuthModule } from '@vfortin/backend-auth';
import { ObservabilityModule } from '@vfortin/backend-observability';
import { ContentModule } from '@vfortin/content-composition';
import {
  type ContentServiceConfig,
  mediaDirectory,
  seoDashboardOptions,
} from '@internal/content-service/config';

/**
 * Class AppModule
 * @class AppModule
 *
 * @description
 * Composes content persistence, admin token verification, observability and scheduled maintenance.
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
   * Creates the Nest dynamic module using validated settings.
   *
   * @param {ContentServiceConfig} config - Validated environment settings for the content service.
   * @returns {DynamicModule} Nest module metadata for the configured service.
   */
  public static forRoot(config: ContentServiceConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ObservabilityModule.forRoot({
          service: 'content-service',
          level: config.LOG_LEVEL,
          pretty: config.NODE_ENV === 'development',
        }),
        AdminAuthModule.forRoot({ issuer: config.AUTH_ISSUER, jwksUrl: config.AUTH_JWKS_URL }),
        ContentModule.register({
          mcp: {
            issuer: config.AUTH_ISSUER,
            jwksUrl: config.AUTH_JWKS_URL,
            resource: new URL('/api/content/mcp', config.AUTH_ISSUER).href,
          },
          databaseUrl: config.CONTENT_DATABASE_URL,
          workers: true,
          mediaDirectory: mediaDirectory(config),
          seo: seoDashboardOptions(config),
        }),
      ],
    };
  }
  // #endregion
}
