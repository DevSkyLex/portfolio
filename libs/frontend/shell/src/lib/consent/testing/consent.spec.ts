import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Mock } from 'vitest';
import { ConsentService } from '@internal/web-shell/lib/consent/consent.service';
import { CONSENT_STORAGE_KEY } from '@internal/web-shell/lib/consent/constants/consent.constants';
import { GoogleAnalyticsService } from '@internal/web-shell/lib/google-analytics/google-analytics.service';

/**
 * Interface AnalyticsDouble
 *
 * @description
 * Google Analytics test double recording the calls of the consent service.
 */
interface AnalyticsDouble {
  readonly measurementId: string;
  readonly enable: Mock<() => void>;
  readonly disable: Mock<() => void>;
}

/**
 * Function setup
 *
 * @description
 * Creates the consent service over a Google Analytics double.
 *
 * @param {{ measurementId?: string; platform?: string }} options - Measurement id and platform.
 * @returns {{ consent: ConsentService; analytics: AnalyticsDouble }} Service and double.
 */
function setup(options: { measurementId?: string; platform?: string } = {}): {
  consent: ConsentService;
  analytics: AnalyticsDouble;
} {
  const analytics: AnalyticsDouble = {
    measurementId: options.measurementId ?? 'G-TEST1234',
    enable: vi.fn<() => void>(),
    disable: vi.fn<() => void>(),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: GoogleAnalyticsService, useValue: analytics },
      { provide: PLATFORM_ID, useValue: options.platform ?? 'browser' },
    ],
  });
  return { consent: TestBed.inject(ConsentService), analytics };
}

/**
 * Function store
 *
 * @description
 * Stores a raw consent record.
 *
 * @param {unknown} record - Record, serialized as JSON.
 * @returns {void}
 */
function store(record: unknown): void {
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
}

describe('ConsentService', (): void => {
  beforeEach((): void => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-04T10:00:00Z'));
  });

  afterEach((): void => {
    vi.useRealTimers();
  });

  it('asks nothing before the stored choice is read, then asks once without one', (): void => {
    const { consent, analytics } = setup();
    expect(consent.enabled).toBe(true);
    expect(consent.bannerVisible()).toBe(false);
    expect(consent.active()).toBe(false);
    consent.restore();
    expect(consent.restored()).toBe(true);
    expect(consent.bannerVisible()).toBe(true);
    expect(consent.active()).toBe(true);
    expect(consent.analyticsGranted()).toBe(false);
    // No choice: nothing starts, and cookies a former acceptance left are removed.
    expect(analytics.enable).not.toHaveBeenCalled();
    expect(analytics.disable).toHaveBeenCalledTimes(1);
    consent.restore();
    expect(analytics.disable).toHaveBeenCalledTimes(1);
  });

  it('restores a current acceptance and starts the measurement', (): void => {
    store({ version: 1, analytics: true, decidedAt: '2026-06-01T10:00:00Z' });
    const { consent, analytics } = setup();
    consent.restore();
    expect(consent.bannerVisible()).toBe(false);
    expect(consent.analyticsGranted()).toBe(true);
    expect(analytics.enable).toHaveBeenCalledTimes(1);
  });

  it('restores a current refusal without starting anything', (): void => {
    store({ version: 1, analytics: false, decidedAt: '2026-11-01T10:00:00Z' });
    const { consent, analytics } = setup();
    consent.restore();
    expect(consent.bannerVisible()).toBe(false);
    expect(analytics.enable).not.toHaveBeenCalled();
    expect(analytics.disable).not.toHaveBeenCalled();
  });

  it('asks again six months after the choice and forgets it', (): void => {
    store({ version: 1, analytics: true, decidedAt: '2026-05-04T10:00:00Z' });
    const { consent, analytics } = setup();
    consent.restore();
    expect(consent.bannerVisible()).toBe(true);
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
    expect(analytics.enable).not.toHaveBeenCalled();
    expect(analytics.disable).toHaveBeenCalled();
  });

  it.each([
    [
      'another version',
      JSON.stringify({ version: 2, analytics: true, decidedAt: '2026-11-01T10:00:00Z' }),
    ],
    ['an invalid date', JSON.stringify({ version: 1, analytics: true, decidedAt: 'yesterday' })],
    [
      'a non-boolean choice',
      JSON.stringify({ version: 1, analytics: 'yes', decidedAt: '2026-11-01T10:00:00Z' }),
    ],
    ['a scalar', '42'],
    ['malformed JSON', '{"version":'],
  ])('asks again for %s', (_label: string, raw: string): void => {
    localStorage.setItem(CONSENT_STORAGE_KEY, raw);
    const { consent } = setup();
    consent.restore();
    expect(consent.bannerVisible()).toBe(true);
  });

  it('stores each choice with its date and applies it at once', (): void => {
    const { consent, analytics } = setup();
    consent.acceptAll();
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? '')).toEqual({
      version: 1,
      analytics: true,
      decidedAt: '2026-11-04T10:00:00.000Z',
    });
    expect(analytics.enable).toHaveBeenCalledTimes(1);
    expect(consent.bannerVisible()).toBe(false);
    consent.rejectAll();
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? '').analytics).toBe(false);
    expect(analytics.disable).toHaveBeenCalledTimes(1);
    expect(consent.analyticsGranted()).toBe(false);
  });

  it('applies a choice the browser refuses to store, for the page only', (): void => {
    const { consent, analytics } = setup();
    const setItem: Mock = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((): never => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    consent.decide(true);
    expect(consent.analyticsGranted()).toBe(true);
    expect(analytics.enable).toHaveBeenCalled();
    setItem.mockRestore();
  });

  it('counts the requests for the preferences, reading the choice first', (): void => {
    store({ version: 1, analytics: true, decidedAt: '2026-11-01T10:00:00Z' });
    const { consent } = setup();
    consent.openPreferences();
    expect(consent.restored()).toBe(true);
    expect(consent.preferencesRequests()).toBe(1);
    expect(consent.active()).toBe(true);
    consent.openPreferences();
    expect(consent.preferencesRequests()).toBe(2);
  });

  it('stays off without a measurement id', (): void => {
    const { consent, analytics } = setup({ measurementId: '' });
    consent.restore();
    expect(consent.enabled).toBe(false);
    expect(consent.bannerVisible()).toBe(false);
    consent.decide(true);
    consent.openPreferences();
    expect(consent.preferencesRequests()).toBe(0);
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
    expect(analytics.enable).not.toHaveBeenCalled();
    expect(analytics.disable).not.toHaveBeenCalled();
  });

  it('reads nothing while prerendering', (): void => {
    store({ version: 1, analytics: true, decidedAt: '2026-11-01T10:00:00Z' });
    const { consent, analytics } = setup({ platform: 'server' });
    consent.restore();
    consent.openPreferences();
    expect(consent.restored()).toBe(false);
    expect(consent.preferencesRequests()).toBe(0);
    expect(analytics.enable).not.toHaveBeenCalled();
  });
});
