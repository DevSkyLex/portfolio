import {
  NavigationMenuContentDirective,
  NavigationMenuItemDirective,
  NavigationMenuTriggerDirective,
} from '@internal/ui/lib/navigation-menu/directives/navigation-menu-item/navigation-menu-item.directive';
import {
  NavigationMenuChevronComponent,
  NavigationMenuIndicatorComponent,
  NavigationMenuViewportComponent,
} from '@internal/ui/lib/navigation-menu/components/navigation-menu-viewport/navigation-menu-viewport.component';
import {
  NavigationMenuDirective,
  NavigationMenuLinkDirective,
  NavigationMenuListDirective,
} from '@internal/ui/lib/navigation-menu/navigation-menu.directive';

/**
 * Constant NavigationMenuImports
 *
 * @description
 * Standalone root, item, trigger, link, indicator, viewport and chevron parts for navigation-menu templates.
 */
export const NavigationMenuImports = [
  NavigationMenuDirective,
  NavigationMenuListDirective,
  NavigationMenuItemDirective,
  NavigationMenuTriggerDirective,
  NavigationMenuChevronComponent,
  NavigationMenuContentDirective,
  NavigationMenuLinkDirective,
  NavigationMenuIndicatorComponent,
  NavigationMenuViewportComponent,
] as const;
