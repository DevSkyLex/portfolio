import { inject } from '@angular/core';
import { type CanMatchFn, Router } from '@angular/router';
import { SessionStore } from '@vfortin/identity-web-data-access';
import { LOGIN_PATH } from '@internal/identity-web-feature/lib/constants/login-path.constants';

/**
 * Function adminGuard
 *
 * @description
 * Allows a cached authenticated session or attempts a cookie refresh before admitting the lazy admin
 * route. When neither succeeds, it redirects to login and preserves the extracted current URL as the
 * post-login destination because `canMatch` segments are relative to the lazy route.
 *
 * @returns {Promise<boolean | UrlTree>} `true` for an authenticated session or a login redirect.
 */
export const adminGuard: CanMatchFn = async () => {
  const session: InstanceType<typeof SessionStore> =
    inject<InstanceType<typeof SessionStore>>(SessionStore);
  const router: Router = inject<Router>(Router);
  const target: string = router.currentNavigation()?.extractedUrl.toString() ?? '/admin';
  if (session.authenticated() || (await session.refresh())) {
    return true;
  }
  return router.createUrlTree([LOGIN_PATH], { queryParams: { redirect: target } });
};
