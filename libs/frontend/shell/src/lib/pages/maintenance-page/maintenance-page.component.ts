import { ChangeDetectionStrategy, Component, RESPONSE_INIT, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NgIcon } from '@ng-icons/core';
import { lucideMail } from '@ng-icons/lucide';
import { SiteContentService, SiteLinksService } from '@vfortin/content-web-data-access';
import { SiteLogoComponent } from '@internal/web-shell/lib/layout/site-layout/components/site-logo/site-logo.component';

/**
 * Constant RETRY_AFTER_SECONDS
 *
 * @description
 * Delay announced to crawlers and clients in `Retry-After`: one hour, a maintenance lasting longer is
 * announced again on the next request.
 *
 * @type {string}
 */
const RETRY_AFTER_SECONDS: string = '3600';

/**
 * Component MaintenancePageComponent
 * @class MaintenancePageComponent
 *
 * @description
 * Screen every public route renders while the owner has the maintenance mode on, outside the site
 * layout (no header navigation or footer): the site mark, the heading, the owner's message or a
 * default line, and the contact e-mail when the profile publishes one. Text stays left-aligned
 * (design rules); the block sits in the middle of the viewport. On the server it answers 503 with
 * `Retry-After` and `X-Robots-Tag: noindex`, so the outage is neither indexed nor cached as content.
 */
@Component({
  selector: 'app-maintenance-page',
  imports: [NgIcon, SiteLogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: '@container flex min-h-dvh flex-col bg-surface text-fg' },
  template: `
    <main class="wrap flex flex-1 items-center py-24 @max-[768px]:py-12">
      <div class="flex max-w-[560px] flex-col items-start gap-8">
        <app-site-logo class="size-18" />
        <div class="flex flex-col gap-4">
          <h1
            class="font-display text-d1 text-fg @max-[768px]:text-d1-sm"
            i18n="@@maintenance.title"
          >
            Site en maintenance
          </h1>
          <p class="text-[20px]/8 text-pretty text-fg-muted @max-[768px]:text-[18px]/7">
            @if (maintenance().message; as message) {
              {{ message }}
            } @else {
              <ng-container i18n="@@maintenance.default">Le site revient très vite.</ng-container>
            }
          </p>
        </div>
        @if (email(); as email) {
          <a
            class="inline-flex min-h-11 items-center gap-2.5 text-[16px]/6 text-fg underline decoration-border-hover underline-offset-4 transition-[text-decoration-color] duration-(--dur-pop) ease-orbit hover:decoration-current focus-visible:decoration-current motion-reduce:transition-none"
            [href]="email.href"
          >
            <ng-icon [svg]="icons.mail" size="18" strokeWidth="1.5" aria-hidden="true" />
            {{ email.label }}
          </a>
        }
      </div>
    </main>
  `,
})
export class MaintenancePageComponent {
  // #region Properties
  /**
   * Property maintenance
   * @readonly
   *
   * @description
   * Maintenance state of the request's snapshot, loaded by the route's `maintenanceGuard`.
   *
   * @type {SiteContentService['maintenance']}
   */
  protected readonly maintenance: SiteContentService['maintenance'] =
    inject<SiteContentService>(SiteContentService).maintenance;

  /**
   * Property email
   * @readonly
   *
   * @description
   * Public e-mail link of the profile, if any.
   *
   * @type {SiteLinksService['email']}
   */
  protected readonly email: SiteLinksService['email'] =
    inject<SiteLinksService>(SiteLinksService).email;

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Icon of the contact link.
   *
   * @type {{ readonly mail: typeof lucideMail }}
   */
  protected readonly icons: { readonly mail: typeof lucideMail } = { mail: lucideMail } as const;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Sets the document title and, during SSR, the 503 status and its headers before rendering.
   */
  public constructor() {
    inject<Title>(Title).setTitle(
      $localize`:@@maintenance.documentTitle:Site en maintenance — Valentin Fortin`,
    );
    const response: ResponseInit | null = inject<ResponseInit | null>(RESPONSE_INIT, {
      optional: true,
    });
    if (response) {
      response.status = 503;
      const headers: Headers = new Headers(response.headers);
      headers.set('Retry-After', RETRY_AFTER_SECONDS);
      headers.set('X-Robots-Tag', 'noindex');
      response.headers = headers;
    }
  }
  // #endregion
}
