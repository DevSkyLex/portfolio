import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from '@internal/identity-service/app/app.module';
import {
  type IdentityServiceConfig,
  loadIdentityServiceConfig,
} from '@internal/identity-service/config';

/**
 * Function bootstrap
 *
 * @description
 * Starts the identity HTTP service with bounded JSON and form bodies, trusted local proxy settings and graceful shutdown.
 * Nx readiness is signalled only after the HTTP server is listening.
 *
 * @returns {Promise<void>} Completion after the service has started and readiness is announced.
 */
async function bootstrap(): Promise<void> {
  const config: IdentityServiceConfig = loadIdentityServiceConfig();
  const app: NestExpressApplication = await NestFactory.create<NestExpressApplication>(
    AppModule.forRoot(config),
    {
      bufferLogs: true,
    },
  );
  app.useLogger(app.get<Logger>(Logger));
  app.set('trust proxy', 'loopback, uniquelocal');
  app.useBodyParser('json', { limit: '8kb' });
  // OAuth token and revocation requests are form-encoded (D45); repeated keys become arrays.
  app.useBodyParser('urlencoded', { limit: '8kb', extended: false });
  app.setGlobalPrefix('api', { exclude: ['health/live', 'health/ready'] });
  app.enableShutdownHooks();
  await app.listen(config.IDENTITY_PORT);
  app.get<Logger>(Logger).log(`identity-service listening on port ${config.IDENTITY_PORT}`);

  // Signal expected by `nx serve` (continuous target with readyWhen.signal).
  if (process.env['NX_READY_SIGNAL_SOCKET']) {
    const load: (specifier: string) => Promise<{ emitReadySignal(server: unknown): boolean }> =
      new Function('s', 'return import(s)') as (
        s: string,
      ) => Promise<{ emitReadySignal(server: unknown): boolean }>;
    (await load('@nx/js/ready-signal')).emitReadySignal(app.getHttpServer());
  }
}

void bootstrap();
