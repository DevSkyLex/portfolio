import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Mock } from 'vitest';
import { ConsentService } from '@internal/web-shell/lib/consent/consent.service';
import { CONSENT_STORAGE_KEY } from '@internal/web-shell/lib/consent/constants/consent.constants';
import { GoogleAnalyticsService } from '@internal/web-shell/lib/google-analytics/google-analytics.service';
import { ConsentBannerComponent } from '@internal/web-shell/lib/layout/site-layout/components/consent-banner/consent-banner.component';

/**
 * Interface Harness
 *
 * @description
 * Rendered banner with its consent service and the Google Analytics double.
 */
interface Harness {
  readonly fixture: ComponentFixture<ConsentBannerComponent>;
  readonly consent: ConsentService;
  readonly enable: Mock<() => void>;
  readonly disable: Mock<() => void>;
}

/**
 * Function render
 *
 * @description
 * Renders the banner after the stored choice is read, as the layout does.
 *
 * @returns {Promise<Harness>} Harness.
 */
async function render(): Promise<Harness> {
  const enable: Mock<() => void> = vi.fn<() => void>();
  const disable: Mock<() => void> = vi.fn<() => void>();
  TestBed.configureTestingModule({
    imports: [ConsentBannerComponent],
    providers: [
      provideRouter([]),
      {
        provide: GoogleAnalyticsService,
        useValue: { measurementId: 'G-TEST1234', enable, disable },
      },
    ],
  });
  const consent: ConsentService = TestBed.inject(ConsentService);
  consent.restore();
  disable.mockClear();
  const fixture: ComponentFixture<ConsentBannerComponent> =
    TestBed.createComponent(ConsentBannerComponent);
  await fixture.whenStable();
  return { fixture, consent, enable, disable };
}

/**
 * Function button
 *
 * @description
 * Finds a button of the document by its text.
 *
 * @param {ParentNode} root - Where to look.
 * @param {string} name - Button text.
 * @returns {HTMLButtonElement} Button.
 */
function button(root: ParentNode, name: string): HTMLButtonElement {
  const found: HTMLButtonElement | undefined = [
    ...root.querySelectorAll<HTMLButtonElement>('button'),
  ].find((candidate: HTMLButtonElement): boolean => candidate.textContent?.trim() === name);
  if (!found) throw new Error(`No button "${name}"`);
  return found;
}

/**
 * Function dialog
 *
 * @description
 * Returns the open preferences dialog.
 *
 * @returns {HTMLElement | null} Dialog.
 */
function dialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="dialog"]');
}

describe('ConsentBannerComponent', (): void => {
  let main: HTMLElement;

  beforeEach((): void => {
    localStorage.clear();
    main = document.createElement('main');
    main.id = 'content';
    main.tabIndex = -1;
    document.body.append(main);
  });

  afterEach((): void => {
    main.remove();
    document.querySelector('.cdk-overlay-container')?.replaceChildren();
  });

  it('asks with a labelled region, refusing and accepting side by side', async (): Promise<void> => {
    const { fixture } = await render();
    const region: HTMLElement | null = fixture.nativeElement.querySelector('section');
    expect(region?.getAttribute('aria-labelledby')).toBe('consent-title');
    expect(region?.querySelector('#consent-title')?.textContent?.trim()).toBe('Cookies');
    expect(region?.getAttribute('aria-describedby')).toBe('consent-text');
    const reject: HTMLButtonElement = button(fixture.nativeElement, 'Tout refuser');
    const accept: HTMLButtonElement = button(fixture.nativeElement, 'Tout accepter');
    // Same weight: same variant and size.
    expect(reject.className).toBe(accept.className);
    expect(button(fixture.nativeElement, 'Personnaliser')).toBeTruthy();
    expect(region?.querySelector('a')?.getAttribute('href')).toBe('/privacy');
  });

  it('refuses from the banner, then hands the focus to the main content', async (): Promise<void> => {
    const { fixture, disable } = await render();
    const reject: HTMLButtonElement = button(fixture.nativeElement, 'Tout refuser');
    reject.focus();
    reject.click();
    await fixture.whenStable();
    expect(disable).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? '').analytics).toBe(false);
    expect(document.activeElement).toBe(main);
  });

  it('accepts from the banner', async (): Promise<void> => {
    const { fixture, enable } = await render();
    button(fixture.nativeElement, 'Tout accepter').click();
    await fixture.whenStable();
    expect(enable).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

  it('customizes with the single purpose off, then saves it on', async (): Promise<void> => {
    const { fixture, enable, consent } = await render();
    button(fixture.nativeElement, 'Personnaliser').click();
    await fixture.whenStable();
    const opened: HTMLElement | null = dialog();
    expect(opened?.getAttribute('aria-modal')).toBe('true');
    expect(opened?.textContent).toContain('Préférences de cookies');
    const purpose: HTMLButtonElement | null =
      opened?.querySelector<HTMLButtonElement>('[role="switch"]') ?? null;
    expect(purpose?.getAttribute('aria-checked')).toBe('false');
    expect(purpose?.getAttribute('aria-label')).toBe('Mesure d’audience (Google Analytics)');
    expect(
      document.getElementById(purpose?.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toContain('Cookies _ga');
    purpose?.click();
    await fixture.whenStable();
    expect(purpose?.getAttribute('aria-checked')).toBe('true');
    button(opened as HTMLElement, 'Enregistrer mes choix').click();
    await fixture.whenStable();
    expect(enable).toHaveBeenCalledTimes(1);
    expect(consent.analyticsGranted()).toBe(true);
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

  it('reopens on request with the current choice, and refuses from the dialog', async (): Promise<void> => {
    const { fixture, consent, disable } = await render();
    consent.acceptAll();
    await fixture.whenStable();
    consent.openPreferences();
    await fixture.whenStable();
    const opened: HTMLElement | null = dialog();
    expect(opened?.querySelector('[role="switch"]')?.getAttribute('aria-checked')).toBe('true');
    // A second request while it is open opens nothing more.
    consent.openPreferences();
    await fixture.whenStable();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    button(opened as HTMLElement, 'Tout refuser').click();
    await fixture.whenStable();
    expect(disable).toHaveBeenCalledTimes(1);
    expect(consent.analyticsGranted()).toBe(false);
  });
});
