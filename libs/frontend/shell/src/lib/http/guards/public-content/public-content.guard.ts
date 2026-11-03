import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { loadSiteContent } from '@vfortin/content-web-data-access';

/** Public route data is required; browser failures have an independent error route, server failures fail the build. */
export const publicContentGuard: CanActivateFn = () => {
  const browser: boolean = isPlatformBrowser(inject<object>(PLATFORM_ID));
  const router: Router = inject<Router>(Router);
  return loadSiteContent().then(
    () => true,
    (error: unknown) => {
      if (!browser) throw error;
      return router.createUrlTree(['/error', '503']);
    },
  );
};
