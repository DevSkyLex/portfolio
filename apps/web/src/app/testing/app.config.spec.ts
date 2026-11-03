/// <reference types="@angular/localize" />
// The application config pulls the whole site, whose copy uses $localize.
import '@angular/localize/init';
import { ApplicationInitStatus, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { appConfig } from '@internal/web/app/app.config';
import { config } from '@internal/web/app/app.config.server';

describe('appConfig', (): void => {
  afterEach((): void => document.documentElement.removeAttribute('data-app'));

  for (const locale of ['fr', 'en'] as const) {
    it(`starts independently of public data and loads ${locale} content on demand`, async (): Promise<void> => {
      TestBed.configureTestingModule({
        providers: [...appConfig.providers, { provide: LOCALE_ID, useValue: locale }],
      });
      const status: ApplicationInitStatus =
        TestBed.inject<ApplicationInitStatus>(ApplicationInitStatus);
      await status.donePromise;
      expect(status.done).toBe(true);
      expect(document.documentElement.hasAttribute('data-app')).toBe(false);
      const harness: RouterTestingHarness = await RouterTestingHarness.create('/');
      const language: Element | null | undefined =
        harness.routeNativeElement?.ownerDocument.querySelector('footer ui-menu-select button');
      expect(language?.textContent?.trim()).toBe(locale === 'en' ? 'English' : 'Français');
      expect(document.documentElement.hasAttribute('data-app')).toBe(true);
    });
  }

  it('adds the server rendering to the browser providers', (): void => {
    expect(config.providers.length).toBe(appConfig.providers.length + 1);
  });
});
