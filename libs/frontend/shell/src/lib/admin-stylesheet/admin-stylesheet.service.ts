import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, isDevMode } from '@angular/core';
import {
  ADMIN_STYLESHEET_ATTRIBUTE,
  ADMIN_STYLESHEET_HREF,
} from '@internal/web-shell/lib/admin-stylesheet/constants/admin-stylesheet.constants';

/**
 * Service AdminStylesheetService
 * @class AdminStylesheetService
 *
 * @description
 * Loads the administration stylesheet once, when the lazy admin area is first entered (D31): the
 * prerendered public pages only reference the public `styles.css`, and the admin route tree resolves
 * after this stylesheet has applied, so no admin screen renders unstyled. The link stays in the
 * document afterwards: `admin.css` holds every utility of the frontend in the cascade order of the
 * public stylesheet, so a public page reached from the admin keeps its look.
 */
@Injectable({ providedIn: 'root' })
export class AdminStylesheetService {
  // #region Properties
  /**
   * Property document
   * @readonly
   *
   * @description
   * Document whose `<head>` receives the stylesheet link.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property browser
   * @readonly
   *
   * @description
   * Whether the application runs in a browser; the admin is client-rendered (D18), so a server never
   * waits for a stylesheet.
   *
   * @type {boolean}
   */
  private readonly browser: boolean = isPlatformBrowser(inject<object>(PLATFORM_ID));

  /**
   * Property loading
   *
   * @description
   * Pending or settled load shared by every caller; cleared after a failure so that the next
   * navigation retries.
   *
   * @type {Promise<void> | undefined}
   */
  private loading: Promise<void> | undefined;
  // #endregion

  // #region Methods
  /**
   * Method load
   * @method load
   *
   * @description
   * Appends the stylesheet link on the first call and settles when the browser has applied it. A
   * loaded sheet without any rule is reported on the console (see `reportEmpty`).
   *
   * @returns {Promise<void>} Resolves once the stylesheet has loaded; rejects, after removing the link,
   * when it cannot be fetched, so that the navigation fails rather than rendering unstyled screens.
   */
  public load(): Promise<void> {
    if (!this.browser) return Promise.resolve();
    this.loading ??= new Promise<void>(
      (resolve: () => void, reject: (reason: Error) => void): void => {
        const link: HTMLLinkElement = this.document.createElement('link');
        link.rel = 'stylesheet';
        link.href = ADMIN_STYLESHEET_HREF;
        link.setAttribute(ADMIN_STYLESHEET_ATTRIBUTE, '');
        link.addEventListener(
          'load',
          (): void => {
            this.reportEmpty(link);
            resolve();
          },
          { once: true },
        );
        link.addEventListener(
          'error',
          (): void => {
            link.remove();
            this.loading = undefined;
            reject(new Error(`Administration stylesheet unavailable: ${ADMIN_STYLESHEET_HREF}`));
          },
          { once: true },
        );
        this.document.head.append(link);
      },
    );
    return this.loading;
  }

  /**
   * Method reportEmpty
   * @method reportEmpty
   *
   * @description
   * Logs an error when the loaded sheet holds no rule: the server answered something other than the
   * `admin` bundle, typically the SPA index of an `ng serve` started before the bundle was added to
   * `apps/web/project.json`, which serves `index.html` for unknown files. The browser still fires `load`
   * then, so without this the admin would render unstyled without any trace.
   *
   * @param {HTMLLinkElement} link - Loaded stylesheet link.
   */
  private reportEmpty(link: HTMLLinkElement): void {
    let rules: number;
    try {
      rules = link.sheet?.cssRules.length ?? 0;
    } catch {
      // Rules of a cross-origin sheet are unreadable; the admin stylesheet is same-origin.
      return;
    }
    if (rules > 0) return;
    console.error(
      `Administration stylesheet ${ADMIN_STYLESHEET_HREF} loaded without any CSS rule: the server did not ` +
        'answer with the admin bundle, so the administration renders unstyled.' +
        (isDevMode()
          ? ' Restart the dev server (npx nx serve web) after a change of the build styles in apps/web/project.json.'
          : ''),
    );
  }
  // #endregion
}
