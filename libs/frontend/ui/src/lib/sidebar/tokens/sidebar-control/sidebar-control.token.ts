import { InjectionToken } from '@angular/core';
import type { SidebarControl } from '@internal/ui/lib/sidebar/models/sidebar/sidebar-control.interface';

/**
 * Constant SIDEBAR_CONTROL
 * @readonly
 *
 * @description
 * Sidebar state read by `ui-sidebar-trigger`. `uiSidebarProvider` provides its `SidebarService`; an
 * application layout owning another sidebar provides its own implementation on the layout element, so
 * that routed pages reach it through the element injector. Without a provider the trigger renders
 * nothing.
 *
 * @type {InjectionToken<SidebarControl>}
 */
export const SIDEBAR_CONTROL: InjectionToken<SidebarControl> = new InjectionToken<SidebarControl>(
  'SIDEBAR_CONTROL',
);
