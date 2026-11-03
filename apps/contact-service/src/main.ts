import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from '@internal/contact-service/app/app.module';
import {
  type ContactServiceConfig,
  loadContactServiceConfig,
} from '@internal/contact-service/config';

/**
 * Function bootstrap
 *
 * @description
 * Starts the contact HTTP service with trusted proxy handling, bounded JSON bodies and graceful shutdown.
 * Nx readiness is signalled only after the HTTP server is listening.
 *
 * @returns {Promise<void>} Completion after the service has started and readiness is announced.
 */
async function bootstrap(): Promise<void> {
  const config: ContactServiceConfig = loadContactServiceConfig();
  const app: NestExpressApplication = await NestFactory.create<NestExpressApplication>(
    AppModule.forRoot(config),
    {
      bufferLogs: true,
    },
  );
  app.useLogger(app.get<Logger>(Logger));

  // Behind Nginx: `req.ip` reads X-Forwarded-For, only from trusted proxies.
  app.set('trust proxy', config.CONTACT_TRUST_PROXY);
  app.useBodyParser('json', { limit: '16kb' });
  app.setGlobalPrefix('api', { exclude: ['health/live', 'health/ready'] });
  app.enableShutdownHooks();
  await app.listen(config.CONTACT_PORT);
  app.get<Logger>(Logger).log(`contact-service listening on port ${config.CONTACT_PORT}`);

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
