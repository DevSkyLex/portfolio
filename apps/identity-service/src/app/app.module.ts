import { type DynamicModule, Module } from '@nestjs/common';
import { ObservabilityModule } from '@vfortin/backend-observability';
import { IdentityModule } from '@vfortin/identity-composition';
import type { IdentityServiceConfig } from '@internal/identity-service/config';

/**
 * Class AppModule
 * @class AppModule
 *
 * @description
 * Composes identity persistence, token signing and observability for the authentication service.
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
   * Creates the Nest dynamic module from validated identity service settings.
   *
   * @param {IdentityServiceConfig} config - Validated environment settings for the identity service.
   * @returns {DynamicModule} Nest module metadata for the configured service.
   */
  public static forRoot(config: IdentityServiceConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ObservabilityModule.forRoot({
          service: 'identity-service',
          level: config.LOG_LEVEL,
          pretty: config.NODE_ENV === 'development',
        }),
        IdentityModule.register({
          databaseUrl: config.IDENTITY_DATABASE_URL,
          keysDir: config.IDENTITY_KEYS_DIR,
          signingKid: config.IDENTITY_SIGNING_KID,
          issuer: config.IDENTITY_ISSUER,
          ...(config.IDENTITY_MCP_RESOURCE ? { mcpResource: config.IDENTITY_MCP_RESOURCE } : {}),
          cookieSecure: config.IDENTITY_COOKIE_SECURE,
        }),
      ],
    };
  }
  // #endregion
}
