import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  type EnvironmentProviders,
  DestroyRef,
  PLATFORM_ID,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  provideZonelessChangeDetection,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  provideClientHydration,
  withEventReplay,
  withIncrementalHydration,
} from '@angular/platform-browser';
import {
  NavigationEnd,
  NavigationError,
  Router,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { provideContentSnapshotLoader, provideSiteOrigin } from '@vfortin/content-web-data-access';
import { authInterceptor } from '@vfortin/identity-web-data-access/http';
import { provideApiHttp } from '@vfortin/web-http';
import { APP_ROUTES } from '@internal/web-shell/lib/app.routes';
import { AUDIENCE_MEASUREMENT } from '@internal/web-shell/lib/consent/tokens/audience-measurement/audience-measurement.token';
import type { WebShellOptions } from '@internal/web-shell/lib/models/web-shell-options/web-shell-options.interface';

/**
 * Function provideWebShell
 *
 * @description
 * Registers application infrastructure. Public content is loaded by its route guard, while
 * successful navigation controls the progressive-enhancement marker (D18, D32).
 *
 * @param {WebShellOptions} options - Browser data source required by the shell.
 *
 * @returns {EnvironmentProviders} Root providers for the web shell.
 */
export function provideWebShell(options: WebShellOptions): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideZonelessChangeDetection(),
    provideRouter(
      APP_ROUTES,
      withComponentInputBinding(),
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    provideClientHydration(withEventReplay(), withIncrementalHydration()),
    provideApiHttp([authInterceptor]),
    provideContentSnapshotLoader(options.contentSnapshot),
    // Origin of the canonical, alternate and sharing addresses (D42).
    provideSiteOrigin(),
    // GA4 measurement id of the build (D48): empty, no consent banner and no Google request.
    {
      provide: AUDIENCE_MEASUREMENT,
      useValue: options.audienceMeasurement ?? { ga4MeasurementId: '' },
    },
    provideEnvironmentInitializer(() => {
      if (!isPlatformBrowser(inject<object>(PLATFORM_ID))) return;
      const root: HTMLElement = inject<Document>(DOCUMENT).documentElement;
      const router: Router = inject<Router>(Router);
      const destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
      router.events.pipe(takeUntilDestroyed(destroyRef)).subscribe((event): void => {
        if (event instanceof NavigationEnd) {
          root.setAttribute('data-app', '');
        } else if (event instanceof NavigationError) {
          // A failed public chunk must not leave prerendered reveal states hidden indefinitely.
          root.removeAttribute('data-app');
          root.removeAttribute('data-js');
        }
      });
    }),
  ]);
}
