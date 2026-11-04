import type { Mock } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  JSON_BODY_LIMIT,
  configureContentHttp,
} from '@internal/content-composition/lib/http/content-http/content-http';

describe('configureContentHttp', (): void => {
  it('installs the JSON limit and leaves /media/ to Nginx unless asked', (): void => {
    const app: { useBodyParser: Mock; use: Mock } = { useBodyParser: vi.fn(), use: vi.fn() };
    configureContentHttp(app as unknown as NestExpressApplication, {
      mediaDirectory: 'media',
      serveMedia: false,
    });
    expect(app.useBodyParser).toHaveBeenCalledExactlyOnceWith('json', { limit: JSON_BODY_LIMIT });
    expect(app.use).not.toHaveBeenCalled();
    configureContentHttp(app as unknown as NestExpressApplication, {
      mediaDirectory: 'media',
      serveMedia: true,
    });
    expect(app.use).toHaveBeenCalledExactlyOnceWith('/media', expect.any(Function));
  });
});
