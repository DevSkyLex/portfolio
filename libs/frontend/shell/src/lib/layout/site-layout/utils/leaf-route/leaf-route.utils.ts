import type { ActivatedRouteSnapshot } from '@angular/router';

/**
 * Function leafRoute
 *
 * @description
 * Follows activated route children until it reaches the leaf route whose data controls the footer.
 *
 * @param {ActivatedRouteSnapshot} route - Route snapshot at the root of the current navigation tree.
 *
 * @returns {ActivatedRouteSnapshot} Deepest active route snapshot.
 */
export const leafRoute = (route: ActivatedRouteSnapshot): ActivatedRouteSnapshot =>
  route.firstChild ? leafRoute(route.firstChild) : route;
