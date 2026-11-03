import { DOCUMENT } from '@angular/common';
import {
  type Signal,
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { lucideExternalLink, lucideLogOut, lucideSearch } from '@ng-icons/lucide';
import { AdminInboxSummaryPort } from '@vfortin/contact-web-data-access/summary';
import { AdminProjectNavigationPort } from '@vfortin/content-web-data-access/navigation';
import { AdminSessionPort } from '@vfortin/identity-web-data-access/session';
import {
  BadgeDirective,
  GlyphComponent,
  KbdDirective,
  ToastService,
  ToasterComponent,
  TooltipDirective,
} from '@vfortin/ui';
import { filter, startWith } from 'rxjs';
import { CommandPaletteComponent } from '@internal/web-shell/lib/admin/layouts/admin-layout/components/command-palette/command-palette.component';
import { ShortcutsDialogComponent } from '@internal/web-shell/lib/admin/layouts/admin-layout/components/shortcuts-dialog/shortcuts-dialog.component';
import { ADMIN_NARROW_QUERY } from '@internal/web-shell/lib/admin/layouts/admin-layout/constants/admin-breakpoint.constants';
import {
  ADMIN_LINKS,
  ADMIN_MESSAGES_PATH,
} from '@internal/web-shell/lib/admin/layouts/admin-layout/constants/admin-links.constants';
import { SIDEBAR_ITEM } from '@internal/web-shell/lib/admin/layouts/admin-layout/constants/sidebar-item.constants';

/**
 * Component AdminLayoutComponent
 * @class AdminLayoutComponent
 *
 * @description
 * Hosts authenticated administration routes in the client-rendered, noindex area: sidebar navigation
 * with the unread message count, logout, a command palette on Ctrl/Cmd+K, the keyboard shortcuts
 * help on `?` (D36) and the single toaster of the administration, which features fill through
 * `ToastService`.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [
    BadgeDirective,
    CommandPaletteComponent,
    GlyphComponent,
    KbdDirective,
    NgIcon,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ShortcutsDialogComponent,
    ToasterComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Page container: the wrap utility steps on its width.
  host: { class: '@container block' },
  template: `
    <div
      class="grid min-h-dvh grid-cols-[232px_minmax(0,1fr)] bg-void @max-[1024px]:grid-cols-1 @max-[1024px]:grid-rows-[auto_minmax(0,1fr)]"
    >
      <aside
        class="sticky top-0 flex h-dvh flex-col gap-3 border-r border-line bg-void px-3 py-3 @max-[1024px]:static @max-[1024px]:h-auto @max-[1024px]:flex-row @max-[1024px]:flex-wrap @max-[1024px]:items-center @max-[1024px]:gap-x-2 @max-[1024px]:gap-y-1 @max-[1024px]:border-r-0 @max-[1024px]:border-b @max-[1024px]:px-4 @max-[1024px]:py-2"
      >
        <a
          class="flex h-9 items-center gap-2.5 rounded-option px-2 outline-2 outline-offset-0 outline-transparent transition-colors duration-(--dur-pop) ease-orbit hover:bg-star/5 focus-visible:outline-signal/55 @max-[1024px]:flex-1"
          routerLink="/admin"
        >
          <span
            class="grid size-6 shrink-0 place-items-center rounded-[6px] bg-aurora-violet text-[24px] text-on-aurora"
            aria-hidden="true"
          >
            <ui-glyph shape="cross" />
          </span>
          <span class="truncate text-[14px] font-semibold text-star">Valentin Fortin</span>
        </a>

        <button
          class="${SIDEBAR_ITEM} mb-2 cursor-pointer border border-line-field hover:border-line-hover @max-[1024px]:mb-0"
          type="button"
          aria-keyshortcuts="Control+K Meta+K"
          uiTooltip="Rechercher (Ctrl K)"
          tooltipPosition="bottom"
          [tooltipDisabled]="!narrow()"
          (click)="openPalette()"
        >
          <ng-icon [svg]="icons.search" size="16" aria-hidden="true" />
          <span class="@max-[1024px]:sr-only">Rechercher…</span>
          <kbd uiKbd class="ml-auto @max-[1024px]:hidden">Ctrl K</kbd>
        </button>

        <nav
          class="flex flex-1 flex-col gap-px @max-[1024px]:order-last @max-[1024px]:w-full @max-[1024px]:flex-none @max-[1024px]:flex-row"
          aria-label="Administration"
        >
          @for (link of links; track link.path) {
            <a
              class="${SIDEBAR_ITEM} aria-[current=page]:bg-star/8 aria-[current=page]:text-star"
              [routerLink]="link.path"
              routerLinkActive
              ariaCurrentWhenActive="page"
            >
              <ng-icon [svg]="link.icon" size="16" aria-hidden="true" />
              {{ link.label }}
              @if (link.path === messagesPath && (inboxSummary.count() ?? 0) > 0) {
                <span uiBadge variant="info" class="ml-auto"
                  >{{ inboxSummary.count() }}<span class="sr-only"> non lu(s)</span></span
                >
              }
            </a>
          }
        </nav>
        @if (inboxSummary.callState().error) {
          <p role="alert" class="text-xs text-danger-ink">Nombre de messages indisponible.</p>
          <button type="button" class="text-xs text-star" (click)="inboxSummary.refresh()">
            Réessayer le compteur
          </button>
        }
        @if (projectNavigation.callState().error) {
          <p role="alert" class="text-xs text-danger-ink">Recherche de projets indisponible.</p>
          <button type="button" class="text-xs text-star" (click)="loadProjects()">
            Réessayer les projets
          </button>
        }

        <div class="flex flex-col gap-px @max-[1024px]:flex-row">
          <a
            class="${SIDEBAR_ITEM}"
            href="/"
            target="_blank"
            rel="noopener"
            uiTooltip="Voir le site"
            tooltipPosition="bottom"
            [tooltipDisabled]="!narrow()"
          >
            <ng-icon [svg]="icons.site" size="16" aria-hidden="true" />
            <span class="@max-[1024px]:sr-only">Voir le site</span>
          </a>
          <button
            class="${SIDEBAR_ITEM} cursor-pointer"
            type="button"
            uiTooltip="Se déconnecter"
            tooltipPosition="bottom"
            [tooltipDisabled]="!narrow()"
            (click)="logout()"
          >
            <ng-icon [svg]="icons.logout" size="16" aria-hidden="true" />
            <span class="@max-[1024px]:sr-only">Se déconnecter</span>
          </button>
        </div>
      </aside>

      <main class="flex min-w-0 flex-col">
        <router-outlet />
      </main>
    </div>

    <app-command-palette
      [links]="links"
      [projects]="projectNavigation.items()"
      (opened)="loadProjects()"
      (pageSelected)="go($event)"
      (siteSelected)="openSite()"
      (logoutSelected)="logout()"
      (shortcutsSelected)="openShortcuts()"
    />
    <app-shortcuts-dialog />
    <!-- Bottom right: clear of the sidebar and of the top bar it becomes on narrow screens. -->
    <ui-toaster position="bottom-right" label="Notifications" closeLabel="Fermer la notification" />
  `,
})
export class AdminLayoutComponent {
  // #region Properties
  /**
   * Property session
   * @readonly
   *
   * @description
   * Owner-published identity capability used to revoke the current refresh-token family on logout.
   *
   * @type {AdminSessionPort}
   */
  private readonly session: AdminSessionPort = inject<AdminSessionPort>(AdminSessionPort);

  /**
   * Property toasts
   * @readonly
   *
   * @description
   * Application-wide toasts shown by the layout's toaster; reports a logout that was not confirmed.
   *
   * @type {ToastService}
   */
  private readonly toasts: ToastService = inject<ToastService>(ToastService);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Router used by the palette and to return the administrator to the login page after logout.
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property document
   * @readonly
   *
   * @description
   * Document whose window opens the public site in a new tab.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property projectNavigation
   * @readonly
   *
   * @description
   * Lists the projects offered by the palette, fetched each time it opens.
   *
   * @type {AdminProjectNavigationPort}
   */
  protected readonly projectNavigation: AdminProjectNavigationPort =
    inject<AdminProjectNavigationPort>(AdminProjectNavigationPort);

  /**
   * Property inboxSummary
   *
   * @description
   * Owner-published count lifecycle, refreshed by the inbox after successful mutations.
   */
  protected readonly inboxSummary: AdminInboxSummaryPort =
    inject<AdminInboxSummaryPort>(AdminInboxSummaryPort);

  /**
   * Property palette
   * @readonly
   *
   * @description
   * Command palette opened by the search entry and by Ctrl/Cmd+K.
   */
  private readonly palette: Signal<CommandPaletteComponent> =
    viewChild.required<CommandPaletteComponent>(CommandPaletteComponent);

  /**
   * Property shortcuts
   * @readonly
   *
   * @description
   * Keyboard shortcuts help, opened by `?` and from the palette.
   */
  private readonly shortcuts: Signal<ShortcutsDialogComponent> =
    viewChild.required<ShortcutsDialogComponent>(ShortcutsDialogComponent);

  /**
   * Property narrow
   * @readonly
   *
   * @description
   * Whether the sidebar is the narrow top bar, whose secondary entries show their icon only and then
   * carry a tooltip; `false` where `matchMedia` is unavailable.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly narrow: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property links
   * @readonly
   *
   * @description
   * Administration sections shown in the sidebar, which turns into a top bar below 1024px.
   */
  protected readonly links: typeof ADMIN_LINKS = ADMIN_LINKS;

  /**
   * Property messagesPath
   * @readonly
   *
   * @description
   * Section whose entry carries the unread count.
   */
  protected readonly messagesPath: typeof ADMIN_MESSAGES_PATH = ADMIN_MESSAGES_PATH;

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the sidebar actions.
   */
  protected readonly icons: {
    readonly logout: typeof lucideLogOut;
    readonly search: typeof lucideSearch;
    readonly site: typeof lucideExternalLink;
  } = {
    logout: lucideLogOut,
    search: lucideSearch,
    site: lucideExternalLink,
  } as const;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Marks the administration document as unavailable to search crawlers and counts unread messages
   * on arrival and after each navigation.
   */
  public constructor() {
    inject<Meta>(Meta).updateTag({ name: 'robots', content: 'noindex, nofollow' });
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        void this.inboxSummary.refresh();
      });
    this.watchWidth(inject<DestroyRef>(DestroyRef));
  }
  // #endregion

  // #region Methods
  /**
   * Method openPalette
   * @method openPalette
   *
   * @description
   * Opens the command palette from the sidebar's search entry.
   */
  protected openPalette(): void {
    this.palette().open();
  }

  /**
   * Method openShortcuts
   * @method openShortcuts
   *
   * @description
   * Opens the keyboard shortcuts help chosen in the palette.
   */
  protected openShortcuts(): void {
    this.shortcuts().open();
  }

  /**
   * Method loadProjects
   * @method loadProjects
   *
   * @description
   * Refreshes the palette's projects each time it opens; a failed list leaves the group out.
   */
  protected loadProjects(): void {
    void this.projectNavigation.refresh();
  }

  /**
   * Method go
   * @method go
   *
   * @description
   * Opens an administration page chosen in the palette.
   *
   * @param {string} path - Absolute admin path.
   *
   * @returns {Promise<void>} Resolves after the navigation.
   */
  protected async go(path: string): Promise<void> {
    await this.router.navigateByUrl(path);
  }

  /**
   * Method openSite
   * @method openSite
   *
   * @description
   * Opens the public site in a new tab, keeping the administration open.
   */
  protected openSite(): void {
    this.document.defaultView?.open('/', '_blank', 'noopener');
  }

  /**
   * Method logout
   * @method logout
   *
   * @description
   * Revokes the session before navigating to login. A failed revoke is reported in an error toast and
   * the administrator stays on the page to retry.
   *
   * @returns {Promise<void>} Resolves after the login navigation completes.
   */
  protected async logout(): Promise<void> {
    if (await this.session.logout()) {
      await this.router.navigateByUrl('/admin/login');
    } else {
      this.toasts.error('La déconnexion n’a pas été confirmée. Réessayez.');
    }
  }

  /**
   * Method watchWidth
   * @method watchWidth
   *
   * @description
   * Follows the narrow layout query until the layout is destroyed. The admin renders in the browser
   * only (D18); the optional calls cover environments without `matchMedia`.
   *
   * @param {DestroyRef} destroyRef - Lifetime of the layout, which removes the listener.
   */
  private watchWidth(destroyRef: DestroyRef): void {
    const query: MediaQueryList | undefined =
      this.document.defaultView?.matchMedia?.(ADMIN_NARROW_QUERY);
    if (!query) {
      return;
    }
    this.narrow.set(query.matches);
    const listener: (event: MediaQueryListEvent) => void = (event: MediaQueryListEvent): void =>
      this.narrow.set(event.matches);
    query.addEventListener('change', listener);
    destroyRef.onDestroy(() => query.removeEventListener('change', listener));
  }
  // #endregion
}
