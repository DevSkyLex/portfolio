import { InjectionToken } from '@angular/core';
import type { NavigationMenuHost } from '@internal/ui/lib/navigation-menu/models/navigation-menu/navigation-menu-host.interface';
import type { NavigationMenuItemRef } from '@internal/ui/lib/navigation-menu/models/navigation-menu/navigation-menu-item-ref.interface';

/**
 * Constant NAVIGATION_MENU
 *
 * @description
 * Injection token through which navigation child directives access their root controller.
 */
export const NAVIGATION_MENU: InjectionToken<NavigationMenuHost> =
  new InjectionToken<NavigationMenuHost>('NAVIGATION_MENU');

/**
 * Constant NAVIGATION_MENU_ITEM
 *
 * @description
 * Injection token through which a navigation trigger resolves the containing item controller.
 */
export const NAVIGATION_MENU_ITEM: InjectionToken<NavigationMenuItemRef> =
  new InjectionToken<NavigationMenuItemRef>('NAVIGATION_MENU_ITEM');
