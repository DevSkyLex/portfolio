/// <reference types="@angular/localize" />
// The application config pulls the whole site, whose copy uses $localize.
import '@angular/localize/init';
import { ApplicationInitStatus, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { appConfig } from '@internal/web/app/app.config';
import { config } from '@internal/web/app/app.config.server';

describe('appConfig', (): void => {
  afterEach((): void => {
    document.documentElement.removeAttribute('data-app');
    vi.unstubAllGlobals();
  });

  for (const locale of ['fr', 'en'] as const) {
    it(`starts independently of public data and loads ${locale} content on demand`, async (): Promise<void> => {
      const fetcher: ReturnType<typeof vi.fn<typeof fetch>> = vi.fn<typeof fetch>(
        async (): Promise<Response> =>
          Response.json({
            locale,
            revision: 1,
            profile: {
              heroIntro: 'Intro',
              aboutStatement: 'About',
              aboutLead: 'Lead',
              facts: [],
              links: [],
            },
            projects: [],
            timeline: [],
            skills: [],
            legal: {
              notice: {
                updatedOn: '2026-11-05',
                document: { type: 'doc', content: [{ type: 'paragraph' }] },
              },
              privacy: {
                updatedOn: '2026-11-05',
                document: { type: 'doc', content: [{ type: 'paragraph' }] },
              },
            },
          }),
      );
      vi.stubGlobal('fetch', fetcher);
      TestBed.configureTestingModule({
        providers: [...appConfig.providers, { provide: LOCALE_ID, useValue: locale }],
      });
      const status: ApplicationInitStatus =
        TestBed.inject<ApplicationInitStatus>(ApplicationInitStatus);
      await status.donePromise;
      expect(status.done).toBe(true);
      expect(fetcher).not.toHaveBeenCalled();
      expect(document.documentElement.hasAttribute('data-app')).toBe(false);
      const harness: RouterTestingHarness = await RouterTestingHarness.create('/');
      const language: Element | null | undefined =
        harness.routeNativeElement?.ownerDocument.querySelector('footer ui-menu-select button');
      expect(language?.textContent?.trim()).toBe(locale === 'en' ? 'English' : 'Français');
      expect(document.documentElement.hasAttribute('data-app')).toBe(true);
      expect(fetcher).toHaveBeenCalledExactlyOnceWith(
        `/api/content/snapshot?locale=${locale}`,
        expect.any(Object),
      );
    });
  }

  it('adds the server rendering to the browser providers', (): void => {
    expect(config.providers.length).toBe(appConfig.providers.length + 1);
  });
});
