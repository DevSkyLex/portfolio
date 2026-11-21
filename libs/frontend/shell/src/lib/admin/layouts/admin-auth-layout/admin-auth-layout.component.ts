import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteLogoComponent } from '@internal/web-shell/lib/layout/site-layout/components/site-logo/site-logo.component';

/**
 * Component AdminAuthLayoutComponent
 * @class AdminAuthLayoutComponent
 *
 * @description
 * Frame of the admin pages rendered without the administration layout (the login and the OAuth
 * consent, D45): the site mark and the owner's name in the top-left corner, like the sidebar head,
 * above the routed page. The identity feature cannot reach the shell's logo, so the shell lays it
 * around the pages; the corner stays free for the page's own links on the right.
 */
@Component({
  selector: 'app-admin-auth-layout',
  imports: [RouterOutlet, SiteLogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block min-h-dvh' },
  template: `
    <div
      class="absolute top-5 left-5 z-10 flex h-8 items-center gap-2.5 px-1"
      data-slot="admin-auth-brand"
    >
      <app-site-logo class="size-7" />
      <span class="text-[14px] font-semibold whitespace-nowrap text-fg">Valentin Fortin</span>
    </div>
    <router-outlet />
  `,
})
export class AdminAuthLayoutComponent {}
