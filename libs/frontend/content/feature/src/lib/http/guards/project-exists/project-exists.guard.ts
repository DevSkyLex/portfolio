import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { SiteContentService } from '@vfortin/content-web-data-access';

/** Required route identity is checked before the article component can retain an empty projection. */
export const projectExistsGuard: CanActivateFn = (route) => {
  const content: SiteContentService = inject<SiteContentService>(SiteContentService);
  const router: Router = inject<Router>(Router);
  const slug: string | null = route.paramMap.get('slug');
  return slug !== null && content.project(slug) !== null
    ? true
    : router.createUrlTree(['/error', '404']);
};
