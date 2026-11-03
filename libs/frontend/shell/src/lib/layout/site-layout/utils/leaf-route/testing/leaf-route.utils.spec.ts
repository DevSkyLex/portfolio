import type { ActivatedRouteSnapshot } from '@angular/router';
import { leafRoute } from '@internal/web-shell/lib/layout/site-layout/utils/leaf-route/leaf-route.utils';

describe('leafRoute', () => {
  it('follows the first children down to the deepest route', () => {
    const leaf: ActivatedRouteSnapshot = { firstChild: null } as ActivatedRouteSnapshot;
    const parent: ActivatedRouteSnapshot = { firstChild: leaf } as ActivatedRouteSnapshot;
    const root: ActivatedRouteSnapshot = { firstChild: parent } as ActivatedRouteSnapshot;
    expect(leafRoute(root)).toBe(leaf);
    expect(leafRoute(leaf)).toBe(leaf);
  });
});
