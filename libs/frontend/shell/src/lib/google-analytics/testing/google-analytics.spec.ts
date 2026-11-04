import { APP_BASE_HREF, BrowserPlatformLocation, PlatformLocation } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AUDIENCE_MEASUREMENT } from '@internal/web-shell/lib/consent/tokens/audience-measurement/audience-measurement.token';
import { GoogleAnalyticsService } from '@internal/web-shell/lib/google-analytics/google-analytics.service';

/**
 * Component BlankPageComponent
 *
 * @description
 * Routed page of the navigation tests.
 */
@Component({
  selector: 'app-blank-page',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class BlankPageComponent {}

/**
 * Type TestWindow
 *
 * @description
 * Window with the Google tag queue.
 */
type TestWindow = Window & { dataLayer?: ArrayLike<unknown>[] } & Record<string, unknown>;

/**
 * Function testWindow
 *
 * @description
 * Returns the jsdom window with the Google tag queue.
 *
 * @returns {TestWindow} Window.
 */
const testWindow = (): TestWindow => window as unknown as TestWindow;

/**
 * Function setup
 *
 * @description
 * Creates the service with a measurement id, a router and a platform.
 *
 * @param {{ measurementId?: string; platform?: string }} options - Settings.
 * @returns {GoogleAnalyticsService} Service.
 */
function setup(
  options: { measurementId?: string; platform?: string } = {},
): GoogleAnalyticsService {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: '', component: BlankPageComponent },
        { path: 'projects/:slug', component: BlankPageComponent },
        { path: 'admin', component: BlankPageComponent },
      ]),
      { provide: APP_BASE_HREF, useValue: '/' },
      // The page views read the browser location: the real history, not TestBed's mock.
      { provide: PlatformLocation, useClass: BrowserPlatformLocation },
      {
        provide: AUDIENCE_MEASUREMENT,
        useValue: { ga4MeasurementId: options.measurementId ?? 'G-TEST1234' },
      },
      { provide: PLATFORM_ID, useValue: options.platform ?? 'browser' },
    ],
  });
  return TestBed.inject(GoogleAnalyticsService);
}

/**
 * Function commands
 *
 * @description
 * Reads the queued Google tag commands as arrays.
 *
 * @returns {unknown[][]} Commands.
 */
function commands(): unknown[][] {
  return (testWindow().dataLayer ?? []).map((entry: ArrayLike<unknown>): unknown[] =>
    Array.from(entry),
  );
}

/**
 * Function tagScripts
 *
 * @description
 * Lists the Google tag scripts of the document.
 *
 * @returns {HTMLScriptElement[]} Scripts.
 */
function tagScripts(): HTMLScriptElement[] {
  return [
    ...document.querySelectorAll<HTMLScriptElement>(
      'script[src^="https://www.googletagmanager.com/"]',
    ),
  ];
}

/**
 * Function pageViews
 *
 * @description
 * Lists the queued page views.
 *
 * @returns {unknown[]} Page view parameters.
 */
function pageViews(): unknown[] {
  return commands()
    .filter((command: unknown[]): boolean => command[0] === 'event' && command[1] === 'page_view')
    .map((command: unknown[]): unknown => command[2]);
}

describe('GoogleAnalyticsService', (): void => {
  beforeEach((): void => {
    delete testWindow().dataLayer;
    for (const script of tagScripts()) script.remove();
    history.replaceState(null, '', '/');
    document.title = 'Valentin Fortin';
  });

  afterEach((): void => {
    for (const name of ['_ga', '_ga_TEST1234', 'theme'])
      document.cookie = `${name}=; Max-Age=0; Path=/`;
  });

  it('loads nothing before consent', (): void => {
    setup();
    expect(tagScripts()).toEqual([]);
    expect(testWindow().dataLayer).toBeUndefined();
  });

  it('queues Consent Mode v2, the grant and the configuration, then adds the tag script', (): void => {
    const analytics: GoogleAnalyticsService = setup();
    analytics.enable();
    expect(commands().slice(0, 2)).toEqual([
      [
        'consent',
        'default',
        {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
        },
      ],
      ['consent', 'update', { analytics_storage: 'granted' }],
    ]);
    expect(commands()[2]?.[0]).toBe('js');
    expect(commands()[3]).toEqual([
      'config',
      'G-TEST1234',
      {
        send_page_view: false,
        cookie_expires: 33_696_000,
        cookie_update: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      },
    ]);
    // gtag.js only reads `arguments` objects.
    expect(Object.prototype.toString.call(testWindow().dataLayer?.[0])).toBe('[object Arguments]');
    const [script] = tagScripts();
    expect(script?.src).toBe('https://www.googletagmanager.com/gtag/js?id=G-TEST1234');
    expect(script?.async).toBe(true);
  });

  it('reports the current page after render, then each navigation but the administration', async (): Promise<void> => {
    const analytics: GoogleAnalyticsService = setup();
    const router: Router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    analytics.enable();
    TestBed.tick();
    expect(pageViews()).toEqual([
      { page_location: 'http://localhost:3000/', page_title: 'Valentin Fortin' },
    ]);
    document.title = 'Movah — Valentin Fortin';
    await router.navigateByUrl('/projects/movah');
    TestBed.tick();
    await router.navigateByUrl('/projects/movah#context');
    TestBed.tick();
    await router.navigateByUrl('/admin');
    TestBed.tick();
    expect(pageViews()).toEqual([
      { page_location: 'http://localhost:3000/', page_title: 'Valentin Fortin' },
      {
        page_location: 'http://localhost:3000/projects/movah',
        page_title: 'Movah — Valentin Fortin',
      },
    ]);
  });

  it('withdraws: denies the storage, stops the collection and deletes the _ga cookies', async (): Promise<void> => {
    const analytics: GoogleAnalyticsService = setup();
    const router: Router = TestBed.inject(Router);
    analytics.enable();
    TestBed.tick();
    document.cookie = '_ga=GA1.1.1.1; Path=/';
    document.cookie = '_ga_TEST1234=GS1.1.1; Path=/';
    document.cookie = 'theme=light; Path=/';
    analytics.disable();
    expect(commands()).toContainEqual(['consent', 'update', { analytics_storage: 'denied' }]);
    expect(testWindow()['ga-disable-G-TEST1234']).toBe(true);
    expect(document.cookie).toBe('theme=light');
    const views: number = pageViews().length;
    await router.navigateByUrl('/projects/movah');
    TestBed.tick();
    expect(pageViews()).toHaveLength(views);

    // Consenting again re-grants the loaded tag without a second script.
    analytics.enable();
    TestBed.tick();
    expect(tagScripts()).toHaveLength(1);
    expect(commands().at(-2)).toEqual(['consent', 'update', { analytics_storage: 'granted' }]);
    expect(testWindow()['ga-disable-G-TEST1234']).toBeUndefined();
    expect(pageViews()).toHaveLength(views + 1);
  });

  it('deletes the cookies left by a past visit without loading the tag', (): void => {
    const analytics: GoogleAnalyticsService = setup();
    document.cookie = '_ga=GA1.1.1.1; Path=/';
    analytics.disable();
    expect(document.cookie).toBe('');
    expect(tagScripts()).toEqual([]);
    expect(commands()).toEqual([]);
  });

  it.each([
    ['a malformed measurement id', { measurementId: 'UA-1234-5' }],
    ['the server', { platform: 'server' }],
  ])(
    'does nothing for %s',
    (_label: string, options: { measurementId?: string; platform?: string }): void => {
      const analytics: GoogleAnalyticsService = setup(options);
      analytics.enable();
      analytics.disable();
      expect(tagScripts()).toEqual([]);
      expect(commands()).toEqual([]);
    },
  );
});
