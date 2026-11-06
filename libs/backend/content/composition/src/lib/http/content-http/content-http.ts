import { NotFoundException } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { type NextFunction, type Request, type Response, static as serveStatic } from 'express';

/**
 * Constant JSON_BODY_LIMIT
 *
 * @description
 * Largest JSON body: a revision carries two article documents bounded by `ARTICLE_DOCUMENT_LIMITS`,
 * far below it (Nginx allows 1100k on the project routes, D40). A larger body is answered 413 `http.413`.
 */
export const JSON_BODY_LIMIT: string = '1mb';

/**
 * Constant MEDIA_FILE
 *
 * @description
 * Names served under `/media/`: a media UUID and its optional 960 px suffix, as Nginx serves them.
 * Anything else (temporary files included) becomes a 404 problem through Nest's exception handler.
 */
const MEDIA_FILE: RegExp = /^\/[0-9a-f-]{36}(-960)?\.webp$/;

/**
 * Interface ContentHttpOptions
 * @interface ContentHttpOptions
 *
 * @description
 * HTTP settings of the content service applied outside the Nest module.
 */
export interface ContentHttpOptions {
  // #region Properties
  /**
   * Property mediaDirectory
   * @readonly
   *
   * @description
   * Directory of the media files.
   */
  readonly mediaDirectory: string;

  /**
   * Property serveMedia
   * @readonly
   *
   * @description
   * Whether the service serves `/media/` itself (`CONTENT_MEDIA_SERVE`): only behind the Angular
   * development proxy, Nginx serves it everywhere else.
   */
  readonly serveMedia: boolean;
  // #endregion
}

/**
 * Function configureContentHttp
 *
 * @description
 * Installs the JSON body parser with its 1 MB limit (the application must be created with
 * `bodyParser: false`, multipart uploads are read by the media route) and, when asked, the static
 * `/media/` route: immutable caching for a year, `nosniff`, no index, no redirect.
 *
 * @param {NestExpressApplication} app - Application before `init` or `listen`.
 * @param {ContentHttpOptions} options - Media settings.
 * @returns {void} Completion after the middleware is registered.
 */
export function configureContentHttp(
  app: NestExpressApplication,
  options: ContentHttpOptions,
): void {
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  if (!options.serveMedia) {
    return;
  }
  const serve: ReturnType<typeof serveStatic> = serveStatic(options.mediaDirectory, {
    dotfiles: 'ignore',
    fallthrough: true,
    immutable: true,
    index: false,
    maxAge: '1y',
    redirect: false,
    setHeaders: (response: Response): void => {
      response.setHeader('X-Content-Type-Options', 'nosniff');
    },
  });
  app.use('/media', (request: Request, response: Response, next: NextFunction): void => {
    if (MEDIA_FILE.test(request.path)) {
      serve(request, response, (error?: unknown): void => {
        next(error ?? new NotFoundException());
      });
      return;
    }
    next(new NotFoundException());
  });
}
