import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Mock } from 'vitest';
import { LEGAL_ROUTES } from '@internal/legal-web-feature/lib/legal.routes';
import type { CookiePreferences } from '@internal/legal-web-feature/lib/models/cookie-preferences/cookie-preferences.interface';
import type { LegalDocument } from '@internal/legal-web-feature/lib/models/legal-document/legal-document.interface';
import { COOKIE_PREFERENCES } from '@internal/legal-web-feature/lib/tokens/cookie-preferences/cookie-preferences.token';
import { LEGAL_DOCUMENTS } from '@internal/legal-web-feature/lib/tokens/legal-documents/legal-documents.token';

/**
 * Constant PRIVACY
 *
 * @description
 * Privacy policy of one paragraph.
 */
const PRIVACY: LegalDocument = {
  updatedOn: '2026-11-04',
  intro: [{ kind: 'paragraph', content: [{ kind: 'text', text: 'Préambule.' }] }],
  sections: [],
};

/**
 * Function render
 *
 * @description
 * Renders the privacy page with an optional cookie preferences port.
 *
 * @param {CookiePreferences | null} cookies - Port, or none.
 * @returns {Promise<HTMLElement>} Page element.
 */
async function render(cookies: CookiePreferences | null): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(LEGAL_ROUTES),
      { provide: LEGAL_DOCUMENTS, useValue: { document: (): LegalDocument => PRIVACY } },
      ...(cookies === null ? [] : [{ provide: COOKIE_PREFERENCES, useValue: cookies }]),
    ],
  });
  const harness: RouterTestingHarness = await RouterTestingHarness.create('/privacy');
  return harness.routeNativeElement as HTMLElement;
}

/**
 * Function manageButton
 *
 * @description
 * Finds « Gérer les cookies » in the page.
 *
 * @param {HTMLElement} root - Page element.
 * @returns {HTMLButtonElement | undefined} Button.
 */
function manageButton(root: HTMLElement): HTMLButtonElement | undefined {
  return [...root.querySelectorAll<HTMLButtonElement>('button')].find(
    (button: HTMLButtonElement): boolean => button.textContent?.trim() === 'Gérer les cookies',
  );
}

describe('PrivacyPageComponent', (): void => {
  it('offers « Gérer les cookies » after the policy when the site measures its audience', async (): Promise<void> => {
    const openPreferences: Mock<() => void> = vi.fn<() => void>();
    const root: HTMLElement = await render({ enabled: true, openPreferences });
    const button: HTMLButtonElement | undefined = manageButton(root);
    expect(button?.type).toBe('button');
    button?.click();
    expect(openPreferences).toHaveBeenCalledTimes(1);
  });

  it('offers nothing without measurement or without the port', async (): Promise<void> => {
    expect(
      manageButton(await render({ enabled: false, openPreferences: vi.fn() })),
    ).toBeUndefined();
    TestBed.resetTestingModule();
    expect(manageButton(await render(null))).toBeUndefined();
  });
});
