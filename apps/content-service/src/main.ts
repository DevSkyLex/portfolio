import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureContentHttp } from '@vfortin/content-composition';
import { Logger } from 'nestjs-pino';
import { AppModule } from '@internal/content-service/app/app.module';
import {
  type ContentServiceConfig,
  loadContentServiceConfig,
  mediaDirectory,
} from '@internal/content-service/config';

/**
 * Function bootstrap
 *
 * @description
 * Starts the content HTTP service, installs graceful shutdown hooks and announces Nx readiness after listening.
 * The default body parsers are off: `configureContentHttp` installs the JSON one with its 1 MB limit, and the
 * media route reads its multipart body itself (D40).
 *
 * @returns {Promise<void>} Completion after the service has started and readiness is announced.
 */
async function bootstrap(): Promise<void> {
  const config: ContentServiceConfig = loadContentServiceConfig();
  const app: NestExpressApplication = await NestFactory.create<NestExpressApplication>(
    AppModule.forRoot(config),
    { bufferLogs: true, bodyParser: false },
  );
  app.useLogger(app.get<Logger>(Logger));
  configureContentHttp(app, {
    mediaDirectory: mediaDirectory(config),
    serveMedia: config.CONTENT_MEDIA_SERVE,
  });
  app.setGlobalPrefix('api', { exclude: ['health/live', 'health/ready'] });
  app.enableShutdownHooks();
  await app.listen(config.CONTENT_PORT);
  app.get<Logger>(Logger).log(`content-service listening on port ${config.CONTENT_PORT}`);

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
