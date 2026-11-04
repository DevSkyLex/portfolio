import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  type Signal,
  type WritableSignal,
  Injectable,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  CONSENT_LIFETIME_MONTHS,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
} from '@internal/web-shell/lib/consent/constants/consent.constants';
import type { ConsentRecord } from '@internal/web-shell/lib/consent/models/consent-record/consent-record.interface';
import { GoogleAnalyticsService } from '@internal/web-shell/lib/google-analytics/google-analytics.service';

/**
 * Function parseRecord
 *
 * @description
 * Reads a stored choice, refusing anything but a record of the current version.
 *
 * @param {string | null} stored - Stored text.
 * @returns {ConsentRecord | null} Record, or `null` when absent or unusable.
 */
function parseRecord(stored: string | null): ConsentRecord | null {
  if (stored === null) return null;
  try {
    const value: unknown = JSON.parse(stored);
    if (value === null || typeof value !== 'object') return null;
    const { version, analytics, decidedAt } = value as Record<string, unknown>;
    return version === CONSENT_VERSION &&
      typeof analytics === 'boolean' &&
      typeof decidedAt === 'string' &&
      !Number.isNaN(Date.parse(decidedAt))
      ? { version, analytics, decidedAt }
      : null;
  } catch {
    return null;
  }
}

/**
 * Function isExpired
 *
 * @description
 * Tells whether a choice is `CONSENT_LIFETIME_MONTHS` calendar months old or more.
 *
 * @param {ConsentRecord} record - Stored choice.
 * @param {Date} now - Current time.
 * @returns {boolean} Whether the choice must be asked again.
 */
function isExpired(record: ConsentRecord, now: Date): boolean {
  const expiry: Date = new Date(record.decidedAt);
  expiry.setUTCMonth(expiry.getUTCMonth() + CONSENT_LIFETIME_MONTHS);
  return expiry.getTime() <= now.getTime();
}

/**
 * Service ConsentService
 * @class ConsentService
 *
 * @description
 * Visitor's cookie choice for the audience measurement (D48), the only purpose needing consent. The
 * choice lives in first-party `localStorage` with its date and is asked again after six months; it
 * starts unknown and is read only in the browser after hydration (`restore`), so nothing about it is
 * prerendered. Accepting starts Google Analytics, refusing or withdrawing stops it and deletes its
 * cookies. With no measurement id the service stays disabled: no banner and no link.
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  // #region Properties
  /**
   * Property analytics
   * @readonly
   *
   * @description
   * Google Analytics, started or stopped by the choice.
   *
   * @type {GoogleAnalyticsService}
   */
  private readonly analytics: GoogleAnalyticsService =
    inject<GoogleAnalyticsService>(GoogleAnalyticsService);

  /**
   * Property enabled
   * @readonly
   *
   * @description
   * Whether the site measures its audience at all (a valid measurement id is configured).
   *
   * @type {boolean}
   */
  public readonly enabled: boolean = this.analytics.measurementId !== '';

  /**
   * Property view
   * @readonly
   *
   * @description
   * Browser window holding the storage, `null` during prerendering.
   *
   * @type {Window | null}
   */
  private readonly view: Window | null = isPlatformBrowser(inject<object>(PLATFORM_ID))
    ? inject<Document>(DOCUMENT).defaultView
    : null;

  /**
   * Property record
   * @readonly
   *
   * @description
   * Current choice, `null` until one is made or while unknown.
   *
   * @type {WritableSignal<ConsentRecord | null>}
   */
  private readonly record: WritableSignal<ConsentRecord | null> = signal<ConsentRecord | null>(
    null,
  );

  /**
   * Property restoredState
   * @readonly
   *
   * @description
   * Whether the stored choice has been read.
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly restoredState: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property requests
   * @readonly
   *
   * @description
   * Number of times the preferences were asked for.
   *
   * @type {WritableSignal<number>}
   */
  private readonly requests: WritableSignal<number> = signal<number>(0);

  /**
   * Property restored
   * @readonly
   *
   * @description
   * Whether the stored choice has been read, which only happens in the browser.
   *
   * @type {Signal<boolean>}
   */
  public readonly restored: Signal<boolean> = this.restoredState.asReadonly();

  /**
   * Property analyticsGranted
   * @readonly
   *
   * @description
   * Whether the visitor accepts the audience measurement.
   *
   * @type {Signal<boolean>}
   */
  public readonly analyticsGranted: Signal<boolean> = computed<boolean>(
    (): boolean => this.record()?.analytics === true,
  );

  /**
   * Property bannerVisible
   * @readonly
   *
   * @description
   * Whether the banner asks for a choice: the measurement is on, the storage was read and holds no
   * current choice.
   *
   * @type {Signal<boolean>}
   */
  public readonly bannerVisible: Signal<boolean> = computed<boolean>(
    (): boolean => this.enabled && this.restoredState() && this.record() === null,
  );

  /**
   * Property preferencesRequests
   * @readonly
   *
   * @description
   * Counter incremented each time the preferences are asked for (« Gérer les cookies », « Personnaliser »);
   * the banner opens its dialog when it grows.
   *
   * @type {Signal<number>}
   */
  public readonly preferencesRequests: Signal<number> = this.requests.asReadonly();

  /**
   * Property active
   * @readonly
   *
   * @description
   * Whether the consent interface is needed at all: the deferred banner chunk loads once it is.
   *
   * @type {Signal<boolean>}
   */
  public readonly active: Signal<boolean> = computed<boolean>(
    (): boolean => this.bannerVisible() || this.requests() > 0,
  );
  // #endregion

  // #region Methods
  /**
   * Method restore
   * @method restore
   *
   * @description
   * Reads the stored choice once, in the browser: an expired or unusable record is removed (and the
   * `_ga*` cookies a past acceptance left), an acceptance starts the measurement.
   *
   * @returns {void}
   */
  public restore(): void {
    if (this.view === null || this.restoredState()) return;
    const storage: Storage | null = this.storage();
    const stored: ConsentRecord | null = parseRecord(this.read(storage));
    const current: ConsentRecord | null =
      stored !== null && !isExpired(stored, new Date()) ? stored : null;
    if (current === null) {
      this.remove(storage);
      if (this.enabled) this.analytics.disable();
    }
    this.record.set(current);
    this.restoredState.set(true);
    if (this.enabled && current?.analytics === true) this.analytics.enable();
  }

  /**
   * Method acceptAll
   * @method acceptAll
   *
   * @description
   * Accepts the audience measurement.
   *
   * @returns {void}
   */
  public acceptAll(): void {
    this.decide(true);
  }

  /**
   * Method rejectAll
   * @method rejectAll
   *
   * @description
   * Refuses the audience measurement, or withdraws a consent given before.
   *
   * @returns {void}
   */
  public rejectAll(): void {
    this.decide(false);
  }

  /**
   * Method decide
   * @method decide
   *
   * @description
   * Stores a choice with its date and applies it at once. Storage refused (private browsing): the
   * choice lasts for the page only.
   *
   * @param {boolean} analytics - Whether the audience measurement is accepted.
   * @returns {void}
   */
  public decide(analytics: boolean): void {
    if (!this.enabled) return;
    const record: ConsentRecord = {
      version: CONSENT_VERSION,
      analytics,
      decidedAt: new Date().toISOString(),
    };
    try {
      this.storage()?.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Storage refused: the choice lasts for the page only.
    }
    this.record.set(record);
    this.restoredState.set(true);
    if (analytics) this.analytics.enable();
    else this.analytics.disable();
  }

  /**
   * Method openPreferences
   * @method openPreferences
   *
   * @description
   * Asks the banner to open the preferences dialog (it is loaded on this first request).
   *
   * @returns {void}
   */
  public openPreferences(): void {
    if (!this.enabled || this.view === null) return;
    this.restore();
    this.requests.update((count: number): number => count + 1);
  }

  /**
   * Method storage
   * @method storage
   *
   * @description
   * Returns the local storage, `null` when the browser refuses it.
   *
   * @returns {Storage | null} Storage.
   */
  private storage(): Storage | null {
    try {
      return this.view?.localStorage ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Method read
   * @method read
   *
   * @description
   * Reads the stored record text.
   *
   * @param {Storage | null} storage - Local storage.
   * @returns {string | null} Stored text, `null` when absent or unreadable.
   */
  private read(storage: Storage | null): string | null {
    try {
      return storage?.getItem(CONSENT_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Removes a stale record.
   *
   * @param {Storage | null} storage - Local storage.
   * @returns {void}
   */
  private remove(storage: Storage | null): void {
    try {
      storage?.removeItem(CONSENT_STORAGE_KEY);
    } catch {
      // Storage refused: nothing was stored either.
    }
  }
  // #endregion
}
