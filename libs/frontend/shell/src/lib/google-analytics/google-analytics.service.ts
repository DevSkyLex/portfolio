import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Injectable,
  Injector,
  PLATFORM_ID,
  afterNextRender,
  inject,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import type { Subscription } from 'rxjs';
import { GA4_MEASUREMENT_ID } from '@internal/web-shell/lib/consent/constants/consent.constants';
import type { AudienceMeasurementSettings } from '@internal/web-shell/lib/consent/models/audience-measurement/audience-measurement.interface';
import { AUDIENCE_MEASUREMENT } from '@internal/web-shell/lib/consent/tokens/audience-measurement/audience-measurement.token';
import {
  GA_COOKIE,
  GA_COOKIE_LIFETIME_SECONDS,
  GTAG_SCRIPT_URL,
  UNMEASURED_PATH,
} from '@internal/web-shell/lib/google-analytics/constants/google-analytics.constants';

/**
 * Type Gtag
 *
 * @description
 * The Google tag command function (`gtag('config', id, {…})`).
 */
type Gtag = (command: string, target: string | Date, parameters?: Record<string, unknown>) => void;

/**
 * Type AnalyticsWindow
 *
 * @description
 * Browser window with the Google tag queue and its per-property kill switch.
 */
type AnalyticsWindow = Window & { dataLayer?: unknown[] } & Record<string, unknown>;

/**
 * Service GoogleAnalyticsService
 * @class GoogleAnalyticsService
 *
 * @description
 * Google Analytics 4 behind the visitor's consent (D48). Nothing of Google exists before `enable`:
 * it queues Consent Mode v2 defaults (every storage denied), grants `analytics_storage` alone, then
 * creates the `gtag.js` script element from the bundle (no inline script, `script-src` allows the
 * Google tag origin). Page views are sent on router navigations, the administration excepted;
 * `disable` denies the storage again, stops the collection and deletes the `_ga*` cookies.
 */
@Injectable({ providedIn: 'root' })
export class GoogleAnalyticsService {
  // #region Properties
  /**
   * Property settings
   * @readonly
   *
   * @description
   * Build-time settings of the measurement.
   *
   * @type {AudienceMeasurementSettings}
   */
  private readonly settings: AudienceMeasurementSettings =
    inject<AudienceMeasurementSettings>(AUDIENCE_MEASUREMENT);

  /**
   * Property measurementId
   * @readonly
   *
   * @description
   * Validated measurement id, empty when the measurement is off.
   *
   * @type {string}
   */
  public readonly measurementId: string = GA4_MEASUREMENT_ID.test(this.settings.ga4MeasurementId)
    ? this.settings.ga4MeasurementId
    : '';

  /**
   * Property document
   * @readonly
   *
   * @description
   * Document receiving the script and holding the cookies.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property view
   * @readonly
   *
   * @description
   * Browser window, `null` during prerendering (nothing is ever loaded there).
   *
   * @type {AnalyticsWindow | null}
   */
  private readonly view: AnalyticsWindow | null = isPlatformBrowser(inject<object>(PLATFORM_ID))
    ? (this.document.defaultView as AnalyticsWindow | null)
    : null;

  /**
   * Property router
   * @readonly
   *
   * @description
   * Router whose navigations become page views.
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Injector of the render hooks that send page views once the page has its title.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property destroyRef
   * @readonly
   *
   * @description
   * Root lifetime, which ends the navigation subscription.
   *
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);

  /**
   * Property gtag
   *
   * @description
   * Command function once the tag is loaded, `null` before.
   *
   * @type {Gtag | null}
   */
  private gtag: Gtag | null = null;

  /**
   * Property granted
   *
   * @description
   * Whether the visitor currently accepts the measurement.
   *
   * @type {boolean}
   */
  private granted: boolean = false;

  /**
   * Property lastPage
   *
   * @description
   * Path and query of the last page view: a navigation to an anchor of the same page is not another
   * view.
   *
   * @type {string | null}
   */
  private lastPage: string | null = null;
  // #endregion

  // #region Methods
  /**
   * Method enable
   * @method enable
   *
   * @description
   * Starts the measurement after consent: loads the tag the first time, grants `analytics_storage`
   * again afterwards, then reports the current page.
   *
   * @returns {void} Does nothing without a measurement id or outside the browser.
   */
  public enable(): void {
    const view: AnalyticsWindow | null = this.view;
    if (view === null || this.measurementId === '') return;
    this.granted = true;
    delete view[`ga-disable-${this.measurementId}`];
    if (this.gtag === null) {
      this.load(view);
    } else {
      this.gtag('consent', 'update', { analytics_storage: 'granted' });
    }
    this.lastPage = null;
    this.schedulePageView();
  }

  /**
   * Method disable
   * @method disable
   *
   * @description
   * Stops the measurement after a refusal or a withdrawal: a loaded tag is told the storage is
   * denied and stops collecting (`ga-disable-<id>`), and the `_ga*` cookies are deleted for this host
   * and its parent domains.
   *
   * @returns {void} Does nothing outside the browser.
   */
  public disable(): void {
    const view: AnalyticsWindow | null = this.view;
    if (view === null) return;
    this.granted = false;
    if (this.gtag !== null) {
      this.gtag('consent', 'update', { analytics_storage: 'denied' });
      view[`ga-disable-${this.measurementId}`] = true;
    }
    this.deleteCookies();
  }

  /**
   * Method load
   * @method load
   *
   * @description
   * Queues the Consent Mode defaults, the grant and the configuration (13-month cookies not extended
   * by visits, no Google signals or ad personalization, page views sent by the router), appends the
   * `gtag.js` script and starts reporting navigations.
   *
   * @param {AnalyticsWindow} view - Browser window.
   * @returns {void}
   */
  private load(view: AnalyticsWindow): void {
    const queue: unknown[] = (view.dataLayer ??= []);
    // gtag.js only reads commands pushed as `arguments` objects, not as arrays.
    const gtag: Gtag = function (): void {
      // eslint-disable-next-line prefer-rest-params
      queue.push(arguments);
    };
    this.gtag = gtag;
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
    gtag('consent', 'update', { analytics_storage: 'granted' });
    gtag('js', new Date());
    gtag('config', this.measurementId, {
      send_page_view: false,
      cookie_expires: GA_COOKIE_LIFETIME_SECONDS,
      cookie_update: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    const script: HTMLScriptElement = this.document.createElement('script');
    script.async = true;
    script.src = `${GTAG_SCRIPT_URL}?id=${encodeURIComponent(this.measurementId)}`;
    this.document.head.appendChild(script);
    const navigations: Subscription = this.router.events.subscribe((event: unknown): void => {
      if (event instanceof NavigationEnd) this.schedulePageView();
    });
    this.destroyRef.onDestroy((): void => navigations.unsubscribe());
  }

  /**
   * Method schedulePageView
   * @method schedulePageView
   *
   * @description
   * Reports the page after its next render, once its title is written.
   *
   * @returns {void}
   */
  private schedulePageView(): void {
    afterNextRender({ read: (): void => this.pageView() }, { injector: this.injector });
  }

  /**
   * Method pageView
   * @method pageView
   *
   * @description
   * Sends a `page_view` for the browser location (the English build's `/en` prefix included), unless
   * the measurement was refused since, the page is in the administration or it was just reported.
   *
   * @returns {void}
   */
  private pageView(): void {
    const location: Location = this.document.location;
    const page: string = `${location.pathname}${location.search}`;
    if (!this.granted || this.gtag === null || UNMEASURED_PATH.test(location.pathname)) return;
    if (page === this.lastPage) return;
    this.lastPage = page;
    this.gtag('event', 'page_view', {
      page_location: `${location.origin}${page}`,
      page_title: this.document.title,
    });
  }

  /**
   * Method deleteCookies
   * @method deleteCookies
   *
   * @description
   * Expires every `_ga*` cookie on the host and on each parent domain, since the tag writes them on
   * the widest domain it can (`cookie_domain: 'auto'`).
   *
   * @returns {void}
   */
  private deleteCookies(): void {
    const labels: string[] = this.document.location.hostname.split('.');
    const domains: string[] = [
      '',
      ...labels
        .slice(0, -1)
        .map(
          (_label: string, index: number): string => `; Domain=.${labels.slice(index).join('.')}`,
        ),
    ];
    for (const entry of this.document.cookie.split(';')) {
      const name: string = entry.split('=')[0]?.trim() ?? '';
      if (!GA_COOKIE.test(name)) continue;
      for (const domain of domains) {
        this.document.cookie = `${name}=; Max-Age=0; Path=/${domain}; SameSite=Lax`;
      }
    }
  }
  // #endregion
}
