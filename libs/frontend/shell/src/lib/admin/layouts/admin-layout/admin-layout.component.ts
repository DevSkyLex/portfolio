import { DOCUMENT } from '@angular/common';
import {
  type Signal,
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  LOCALE_ID,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { flagFr, flagGb } from '@ng-icons/flag-icons';
import {
  lucideExternalLink,
  lucideLogOut,
  lucideMonitor,
  lucideMoon,
  lucideRotateCw,
  lucideSearch,
  lucideSun,
} from '@ng-icons/lucide';
import { AdminInboxSummaryPort } from '@vfortin/contact-web-data-access/summary';
import { AdminProjectNavigationPort } from '@vfortin/content-web-data-access/navigation';
import { AdminSessionPort } from '@vfortin/identity-web-data-access/session';
import type { Language } from '@internal/web-shell/lib/layout/site-layout/models/language/language.type';
import type { ThemeMode } from '@internal/web-shell/lib/theme/models/theme-mode/theme-mode.type';
import { ThemeService } from '@internal/web-shell/lib/theme/theme.service';
import {
  CountBadgeComponent,
  ButtonDirective,
  DropdownMenuImports,
  GlyphComponent,
  KbdDirective,
  ModifierKeyService,
  type OverlaySide,
  type PanelSize,
  ResizableHandleComponent,
  ResizableLayoutService,
  ResizablePanelDirective,
  ResizablePanelGroupDirective,
  SIDEBAR_CONTROL,
  ToastService,
  ToasterComponent,
  TooltipDirective,
} from '@vfortin/ui';
import { filter, startWith } from 'rxjs';
import { CommandPaletteComponent } from '@internal/web-shell/lib/admin/layouts/admin-layout/components/command-palette/command-palette.component';
import { ShortcutsDialogComponent } from '@internal/web-shell/lib/admin/layouts/admin-layout/components/shortcuts-dialog/shortcuts-dialog.component';
import {
  ADMIN_DOCUMENT_ATTRIBUTE,
  ADMIN_NARROW_QUERY,
  ADMIN_SCROLLBAR_PROPERTY,
} from '@internal/web-shell/lib/admin/layouts/admin-layout/constants/admin-breakpoint.constants';
import {
  ADMIN_LINKS,
  ADMIN_MESSAGES_PATH,
} from '@internal/web-shell/lib/admin/layouts/admin-layout/constants/admin-links.constants';
import { localeUrl } from '@internal/web-shell/lib/admin/layouts/admin-layout/utils/locale-url/locale-url.utils';
import { ADMIN_SIDEBAR_LAYOUT } from '@internal/web-shell/lib/admin/layouts/admin-layout/constants/admin-sidebar-layout.constants';
import { AdminSidebarStateService } from '@internal/web-shell/lib/admin/layouts/admin-layout/services/admin-sidebar-state/admin-sidebar-state.service';
import {
  SIDEBAR_COMPACT_WIDTH,
  SIDEBAR_ITEM,
} from '@internal/web-shell/lib/admin/layouts/admin-layout/constants/sidebar-item.constants';

/**
 * Component AdminLayoutComponent
 * @class AdminLayoutComponent
 *
 * @description
 * Hosts authenticated administration routes in the client-rendered, noindex area: sidebar navigation
 * with the unread message count, logout, a command palette on Ctrl/Cmd+K, the keyboard shortcuts
 * help on `?` (D36) and the single toaster of the administration, which features fill through
 * `ToastService`. A skip link leads to the page. Above the narrow breakpoint the sidebar is
 * resizable between 200 and 360 px, its width remembered per viewer, and collapses to a 56 px icon
 * rail from the `ui-sidebar-trigger` of each page bar or `[` (`AdminSidebarStateService`, provided
 * here as `SIDEBAR_CONTROL`); below it the sidebar becomes a single top bar and does not collapse.
 *
 * While mounted, the layout marks `<html>` with `data-admin`, which drops the document's stable
 * scrollbar gutter (`apps/web/src/admin.css`), and spans the viewport scrollbar included: its
 * container width then equals the width `matchMedia` reads, so the `@max-[…]` container variants of
 * the administration pages switch at the same width as their `matchMedia` signals whether or not the
 * document scrolls. The page group gives the scrollbar's width back as a right margin.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [
    CountBadgeComponent,
    ButtonDirective,
    DropdownMenuImports,
    CommandPaletteComponent,
    GlyphComponent,
    KbdDirective,
    NgIcon,
    RouterLink,
    RouterLinkActive,
    ResizableHandleComponent,
    ResizablePanelDirective,
    ResizablePanelGroupDirective,
    RouterOutlet,
    ShortcutsDialogComponent,
    ToasterComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Routed pages reach the sidebar state through the layout's element injector.
  providers: [
    AdminSidebarStateService,
    { provide: SIDEBAR_CONTROL, useExisting: AdminSidebarStateService },
  ],
  // Page container spanning the viewport, scrollbar included (see the class comment).
  host: { class: '@container block w-screen', '(window:keydown)': 'toggleShortcut($event)' },
  template: `
    <!-- Off-screen until focused; fixed, so that showing it never moves the page. -->
    <a
      class="fixed top-2 left-2 z-50 -translate-y-12 rounded-md bg-fill px-4 py-2 text-[13px]/5 font-medium text-on-fill focus:translate-y-0"
      [href]="'#' + page.id"
      (click)="skipToContent($event, pageElement)"
      i18n="@@admin.shell.skip"
    >
      Aller au contenu
    </a>
    <!--
      Below 1024 px the group stacks the top bar over the page; the important flex utilities override
      the panels' inline flex sizes from the container query, so the stack follows the same CSS
      breakpoint as the top bar.
    -->
    <div
      uiResizablePanelGroup
      #sidebarGroup="uiResizablePanelGroup"
      class="mr-(--admin-scrollbar) min-h-dvh w-auto bg-surface @max-[1024px]:flex-col"
      (layoutChange)="saveSidebar(sidebarGroup.pixelSizes()[0])"
    >
      <!--
        Collapsed, the important basis overrides the panel's inline flex (its width stays stored in the
        group, so expanding restores it); the flex only transitions during a toggle. Without its
        separator the rail keeps the same 1 px hairline on its end edge, drawn by a pseudo-element.
      -->
      <aside
        uiResizablePanel
        #sidebarPanel="uiResizablePanel"
        [defaultSize]="sidebarDefault()"
        [minSize]="sidebarLayout.limits[0].min"
        [maxSize]="sidebarLayout.limits[0].max"
        [attr.data-collapsed]="rail() ? '' : null"
        [attr.data-transitioning]="sidebarState.transitioning() ? '' : null"
        class="group/sidebar sticky top-0 h-dvh bg-surface data-collapsed:flex-[0_0_56px]! data-collapsed:after:absolute data-collapsed:after:inset-y-0 data-collapsed:after:end-0 data-collapsed:after:w-px data-collapsed:after:bg-border data-collapsed:after:content-[''] motion-safe:data-transitioning:transition-[flex] motion-safe:data-transitioning:duration-(--dur-roll) motion-safe:data-transitioning:ease-orbit @max-[1024px]:static @max-[1024px]:h-auto @max-[1024px]:flex-none!"
        (transitionend)="settleSidebar($event)"
        (transitioncancel)="settleSidebar($event)"
      >
        <!--
          The padding sits inside: on the panel itself it would add to its size. Below 1024 px one
          48 px bar holds the workspace, the search, the sections and the site and logout entries;
          below 640 px the sections take a second row.
        -->
        <div
          class="flex h-full flex-col gap-3 px-3 py-3 @max-[1024px]:min-h-12 @max-[1024px]:flex-row @max-[1024px]:flex-wrap @max-[1024px]:items-center @max-[1024px]:gap-x-2 @max-[1024px]:gap-y-1 @max-[1024px]:border-b @max-[1024px]:border-border @max-[1024px]:px-4 @max-[1024px]:py-1.75"
        >
          <a
            class="flex h-9 items-center gap-2.5 rounded-md px-1 outline-2 outline-offset-0 outline-transparent transition-colors duration-(--dur-pop) ease-orbit hover:bg-surface-hover focus-visible:outline-accent/55 @max-[1024px]:h-8 @max-[1024px]:flex-none @max-[1024px]:rounded-sm"
            routerLink="/admin"
            uiTooltip="Valentin Fortin"
            tooltipPosition="right"
            [tooltipDisabled]="!rail()"
          >
            <span
              class="grid size-7 shrink-0 place-items-center rounded-xs bg-aurora-violet text-[24px] text-on-fill"
              aria-hidden="true"
            >
              <ui-glyph shape="cross" />
            </span>
            <span
              class="truncate text-[14px] font-semibold whitespace-nowrap text-fg group-data-collapsed/sidebar:sr-only"
              >Valentin Fortin</span
            >
          </a>

          <button
            class="${SIDEBAR_ITEM} mb-2 cursor-pointer border border-border-field group-data-collapsed/sidebar:px-[7px] hover:border-border-hover @max-[1024px]:mb-0 @max-[1024px]:border-0"
            type="button"
            [attr.aria-keyshortcuts]="modifier.ariaKeys(['Mod', 'K'])"
            uiTooltip="Rechercher"
            i18n-uiTooltip="@@admin.shell.search"
            [tooltipPosition]="tooltipSide()"
            [tooltipShortcut]="modifier.caps(['Mod', 'K'])"
            [tooltipDisabled]="!iconOnly()"
            (click)="openPalette()"
          >
            <ng-icon [svg]="icons.search" size="16" aria-hidden="true" />
            <span
              class="min-w-0 truncate whitespace-nowrap group-data-collapsed/sidebar:sr-only @max-[1024px]:sr-only"
              i18n="@@admin.shell.searchEllipsis"
              >Rechercher…</span
            >
            <!-- A narrow sidebar drops the caps before the label truncates. -->
            @if (!compactSidebar()) {
              <kbd
                uiKbd
                class="ml-auto shrink-0 whitespace-nowrap group-data-collapsed/sidebar:hidden @max-[1024px]:hidden"
                >{{ modifier.key }} K</kbd
              >
            }
          </button>

          <nav
            class="flex flex-1 flex-col gap-px @max-[1024px]:flex-row @max-[640px]:order-last @max-[640px]:basis-full"
            aria-label="Administration"
            i18n-aria-label="@@admin.shell.nav.label"
          >
            @for (link of links; track link.path) {
              <!-- In the rail, the unread count becomes a 16 px solid badge on the icon's corner. -->
              <a
                class="${SIDEBAR_ITEM} relative aria-[current=page]:bg-surface-selected aria-[current=page]:text-fg"
                [routerLink]="link.path"
                routerLinkActive
                ariaCurrentWhenActive="page"
                [uiTooltip]="link.label"
                tooltipPosition="right"
                [tooltipDisabled]="!rail()"
              >
                <ng-icon [svg]="link.icon" size="16" aria-hidden="true" />
                <!-- The trailing space keeps the label apart from the count in the accessible name. -->
                <span class="whitespace-nowrap group-data-collapsed/sidebar:sr-only"
                  >{{ link.label }}
                </span>
                @if (link.path === messagesPath && inboxSummary.count(); as unread) {
                  <ui-count-badge
                    class="ml-auto group-data-collapsed/sidebar:absolute group-data-collapsed/sidebar:top-0.5 group-data-collapsed/sidebar:right-0.5 group-data-collapsed/sidebar:ml-0 group-data-collapsed/sidebar:h-4 group-data-collapsed/sidebar:min-w-4 group-data-collapsed/sidebar:px-1 group-data-collapsed/sidebar:text-[10px]/3"
                    [count]="unread"
                    ><span class="sr-only"> {{ unreadLabel(unread) }}</span></ui-count-badge
                  >
                }
              </a>
            }
          </nav>
          @if (inboxSummary.callState().error) {
            <p
              role="alert"
              class="text-xs text-danger-ink group-data-collapsed/sidebar:sr-only @max-[1024px]:order-last"
              i18n="@@admin.shell.inboxUnavailable"
            >
              Nombre de messages indisponible.
            </p>
            <button
              uiBtn
              variant="ghost"
              size="xs"
              type="button"
              class="self-start group-data-collapsed/sidebar:w-8 group-data-collapsed/sidebar:px-0 @max-[1024px]:order-last"
              uiTooltip="Réessayer le compteur"
              i18n-uiTooltip="@@admin.shell.inboxRetry"
              tooltipPosition="right"
              [tooltipDisabled]="!rail()"
              (click)="inboxSummary.refresh()"
            >
              <ng-icon
                class="hidden group-data-collapsed/sidebar:block"
                [svg]="icons.retry"
                size="14"
                aria-hidden="true"
              />
              <span class="group-data-collapsed/sidebar:sr-only" i18n="@@admin.shell.inboxRetry"
                >Réessayer le compteur</span
              >
            </button>
          }
          @if (projectNavigation.callState().error) {
            <p
              role="alert"
              class="text-xs text-danger-ink group-data-collapsed/sidebar:sr-only @max-[1024px]:order-last"
              i18n="@@admin.shell.projectsUnavailable"
            >
              Recherche de projets indisponible.
            </p>
            <button
              uiBtn
              variant="ghost"
              size="xs"
              type="button"
              class="self-start group-data-collapsed/sidebar:w-8 group-data-collapsed/sidebar:px-0 @max-[1024px]:order-last"
              uiTooltip="Réessayer les projets"
              i18n-uiTooltip="@@admin.shell.projectsRetry"
              tooltipPosition="right"
              [tooltipDisabled]="!rail()"
              (click)="loadProjects()"
            >
              <ng-icon
                class="hidden group-data-collapsed/sidebar:block"
                [svg]="icons.retry"
                size="14"
                aria-hidden="true"
              />
              <span class="group-data-collapsed/sidebar:sr-only" i18n="@@admin.shell.projectsRetry"
                >Réessayer les projets</span
              >
            </button>
          }

          <div class="flex flex-col gap-px @max-[1024px]:ml-auto @max-[1024px]:flex-row">
            <!-- The site's own preference (ThemeService): one choice for the admin and the public pages. -->
            <button
              #themeTrigger
              class="${SIDEBAR_ITEM} cursor-pointer"
              type="button"
              align="start"
              uiTooltip="Thème"
              i18n-uiTooltip="@@layout.theme"
              [tooltipPosition]="tooltipSide()"
              [tooltipDisabled]="!iconOnly()"
              [uiDropdownMenuTrigger]="themeMenu"
              [attr.aria-label]="themeLabel()"
            >
              <ng-icon [svg]="themeIcons[theme.mode()]" size="16" aria-hidden="true" />
              <span
                class="whitespace-nowrap group-data-collapsed/sidebar:sr-only @max-[1024px]:sr-only"
                i18n="@@layout.theme"
                >Thème</span
              >
            </button>
            <ng-template #themeMenu>
              <div uiDropdownMenuContent class="min-w-40">
                <div
                  uiDropdownMenuRadioGroup
                  [value]="theme.mode()"
                  (valueChange)="setTheme($event, themeTrigger)"
                >
                  @for (option of themes; track option.value) {
                    <button uiDropdownMenuRadioItem type="button" [value]="option.value">
                      <ui-dropdown-menu-item-indicator />
                      <ng-icon [svg]="themeIcons[option.value]" size="14" aria-hidden="true" />
                      {{ option.label }}
                    </button>
                  }
                </div>
              </div>
            </ng-template>
            <!--
              Each locale is a separate build (French at /, English at /en/): choosing the other one
              loads the same admin address from it.
            -->
            <button
              class="${SIDEBAR_ITEM} cursor-pointer"
              type="button"
              align="start"
              uiTooltip="Langue"
              i18n-uiTooltip="@@layout.language"
              [tooltipPosition]="tooltipSide()"
              [tooltipDisabled]="!iconOnly()"
              [uiDropdownMenuTrigger]="languageMenu"
              [attr.aria-label]="languageLabel()"
            >
              <span
                class="flex h-3 w-4 shrink-0 items-center overflow-hidden rounded-2xs"
                aria-hidden="true"
              >
                <ng-icon [svg]="flags[locale]" size="16" />
              </span>
              <span
                class="whitespace-nowrap group-data-collapsed/sidebar:sr-only @max-[1024px]:sr-only"
                i18n="@@layout.language"
                >Langue</span
              >
            </button>
            <ng-template #languageMenu>
              <div uiDropdownMenuContent class="min-w-40">
                <div
                  uiDropdownMenuRadioGroup
                  [value]="locale"
                  (valueChange)="switchLanguage($event)"
                >
                  @for (option of languages; track option.value) {
                    <button
                      uiDropdownMenuRadioItem
                      type="button"
                      [value]="option.value"
                      [attr.lang]="option.value"
                    >
                      <ui-dropdown-menu-item-indicator />
                      <span
                        class="flex h-3 w-4 shrink-0 items-center overflow-hidden rounded-2xs"
                        aria-hidden="true"
                      >
                        <ng-icon [svg]="flags[option.value]" size="16" />
                      </span>
                      {{ option.label }}
                    </button>
                  }
                </div>
              </div>
            </ng-template>
            <a
              class="${SIDEBAR_ITEM}"
              [href]="siteHref"
              target="_blank"
              rel="noopener"
              uiTooltip="Voir le site"
              i18n-uiTooltip="@@admin.shell.viewSite"
              [tooltipPosition]="tooltipSide()"
              [tooltipDisabled]="!iconOnly()"
            >
              <ng-icon [svg]="icons.site" size="16" aria-hidden="true" />
              <span
                class="whitespace-nowrap group-data-collapsed/sidebar:sr-only @max-[1024px]:sr-only"
                i18n="@@admin.shell.viewSite"
                >Voir le site</span
              >
            </a>
            <button
              class="${SIDEBAR_ITEM} cursor-pointer"
              type="button"
              uiTooltip="Se déconnecter"
              i18n-uiTooltip="@@admin.shell.logout"
              [tooltipPosition]="tooltipSide()"
              [tooltipDisabled]="!iconOnly()"
              (click)="logout()"
            >
              <ng-icon [svg]="icons.logout" size="16" aria-hidden="true" />
              <span
                class="whitespace-nowrap group-data-collapsed/sidebar:sr-only @max-[1024px]:sr-only"
                i18n="@@admin.shell.logout"
                >Se déconnecter</span
              >
            </button>
          </div>
        </div>

        <!-- Inside the complementary landmark, along its edge, for the axe region rule. -->
        @if (!narrow() && !rail()) {
          <ui-resizable-handle
            #sidebarHandle
            label="Redimensionner la barre latérale"
            i18n-label="@@admin.shell.resizeSidebar"
            class="outline-2 hover:bg-border-hover focus-visible:bg-fg focus-visible:outline-accent/55 data-dragging:bg-fg @max-[1024px]:hidden"
            step="16px"
            (dblclick)="resetSidebar(sidebarGroup, sidebarHandle)"
          />
        }
      </aside>

      <main
        #page="uiResizablePanel"
        #pageElement
        tabindex="-1"
        uiResizablePanel
        [minSize]="sidebarLayout.limits[1].min"
        [maxSize]="sidebarLayout.limits[1].max"
        class="flex flex-col overflow-visible outline-none @max-[1024px]:flex-auto!"
      >
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
    <ui-toaster position="bottom-right" />
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
   * Property sidebarState
   * @readonly
   *
   * @description
   * Collapsed state of the sidebar, shared with the pages' triggers as `SIDEBAR_CONTROL`.
   *
   * @type {AdminSidebarStateService}
   */
  protected readonly sidebarState: AdminSidebarStateService =
    inject<AdminSidebarStateService>(AdminSidebarStateService);

  /**
   * Property rail
   * @readonly
   *
   * @description
   * Whether the sidebar shows as its 56 px icon rail: collapsed, from 1024 px up.
   *
   * @type {Signal<boolean>}
   */
  protected readonly rail: Signal<boolean> = this.sidebarState.rail;

  /**
   * Property iconOnly
   * @readonly
   *
   * @description
   * Whether the search, site and logout entries show their icon only (top bar or rail) and then carry
   * a tooltip.
   *
   * @type {Signal<boolean>}
   */
  protected readonly iconOnly: Signal<boolean> = computed<boolean>(
    (): boolean => this.narrow() || this.rail(),
  );

  /**
   * Property tooltipSide
   * @readonly
   *
   * @description
   * Side of the icon-only entries' tooltips: beside the rail, below the top bar.
   *
   * @type {Signal<OverlaySide>}
   */
  protected readonly tooltipSide: Signal<OverlaySide> = computed<OverlaySide>((): OverlaySide =>
    this.rail() ? 'right' : 'bottom',
  );

  /**
   * Property sidebarPanel
   * @readonly
   *
   * @description
   * Sidebar panel, whose id the triggers reference with `aria-controls`.
   *
   * @type {Signal<ResizablePanelDirective | undefined>}
   */
  private readonly sidebarPanel: Signal<ResizablePanelDirective | undefined> =
    viewChild<ResizablePanelDirective>('sidebarPanel');

  /**
   * Property layouts
   * @readonly
   *
   * @description
   * Per-viewer storage of the sidebar width.
   *
   * @type {ResizableLayoutService}
   */
  private readonly layouts: ResizableLayoutService =
    inject<ResizableLayoutService>(ResizableLayoutService);

  /**
   * Property sidebarLayout
   * @readonly
   *
   * @description
   * Default split, bounds and storage key of the sidebar and the page.
   */
  protected readonly sidebarLayout: typeof ADMIN_SIDEBAR_LAYOUT = ADMIN_SIDEBAR_LAYOUT;

  /**
   * Property sidebarWidth
   * @readonly
   *
   * @description
   * Last sidebar width in pixels, read from storage before the first render so the sidebar starts at
   * its remembered width (232 px by default, or after a percentage layout stored before), and kept in
   * step with each save.
   *
   * @type {WritableSignal<number>}
   */
  protected readonly sidebarWidth: WritableSignal<number> = signal<number>(
    this.layouts.readPixels(ADMIN_SIDEBAR_LAYOUT),
  );

  /**
   * Property sidebarDefault
   * @readonly
   *
   * @description
   * Sidebar width bound to its panel, as a pixel size.
   *
   * @type {Signal<PanelSize>}
   */
  protected readonly sidebarDefault: Signal<PanelSize> = computed<PanelSize>(
    (): PanelSize => `${this.sidebarWidth()}px` as const,
  );

  /**
   * Property sidebarGroup
   * @readonly
   *
   * @description
   * Group of the sidebar and the page, whose measured sidebar width hides the search key caps.
   *
   * @type {Signal<ResizablePanelGroupDirective>}
   */
  private readonly sidebarGroup: Signal<ResizablePanelGroupDirective> =
    viewChild.required<ResizablePanelGroupDirective>(ResizablePanelGroupDirective);

  /**
   * Property compactSidebar
   * @readonly
   *
   * @description
   * Whether the sidebar is too narrow for the search label and its key caps together.
   *
   * @type {Signal<boolean>}
   */
  protected readonly compactSidebar: Signal<boolean> = computed<boolean>((): boolean => {
    const width: number = this.sidebarGroup().pixelSizes()[0] ?? 0;
    return width > 0 && width < SIDEBAR_COMPACT_WIDTH;
  });

  /**
   * Property modifier
   * @readonly
   *
   * @description
   * Platform modifier of the palette shortcut, `Ctrl` or `⌘`.
   *
   * @type {ModifierKeyService}
   */
  protected readonly modifier: ModifierKeyService = inject<ModifierKeyService>(ModifierKeyService);

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
    readonly retry: typeof lucideRotateCw;
    readonly search: typeof lucideSearch;
    readonly site: typeof lucideExternalLink;
  } = {
    logout: lucideLogOut,
    retry: lucideRotateCw,
    search: lucideSearch,
    site: lucideExternalLink,
  } as const;

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Language of this build of the administration: French at `/admin`, English at `/en/admin`.
   *
   * @type {Language}
   */
  protected readonly locale: Language = inject<string>(LOCALE_ID).startsWith('en') ? 'en' : 'fr';

  /**
   * Property languages
   * @readonly
   *
   * @description
   * Choices of the « Langue » menu, each named in its own language, as in the public footer.
   *
   * @type {readonly { readonly value: Language; readonly label: string }[]}
   */
  protected readonly languages: readonly { readonly value: Language; readonly label: string }[] = [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'English' },
  ];

  /**
   * Property flags
   * @readonly
   *
   * @description
   * Flag of each language (`@ng-icons/flag-icons`, shared with the public language menu).
   *
   * @type {Readonly<Record<Language, string>>}
   */
  protected readonly flags: Readonly<Record<Language, string>> = { fr: flagFr, en: flagGb };

  /**
   * Property plurals
   * @readonly
   *
   * @description
   * Plural rules of the build locale, for the unread count read by screen readers.
   *
   * @type {Intl.PluralRules}
   */
  private readonly plurals: Intl.PluralRules = new Intl.PluralRules(inject<string>(LOCALE_ID));

  /**
   * Property siteHref
   * @readonly
   *
   * @description
   * Home page of the public site in the administration's language.
   *
   * @type {string}
   */
  protected readonly siteHref: string = this.locale === 'en' ? '/en/' : '/';

  /**
   * Property theme
   * @readonly
   *
   * @description
   * Theme preference shared with the public pages.
   *
   * @type {ThemeService}
   */
  protected readonly theme: ThemeService = inject<ThemeService>(ThemeService);

  /**
   * Property themes
   * @readonly
   *
   * @description
   * Choices of the « Thème » menu, with the public menu's messages.
   */
  protected readonly themes: readonly { readonly value: ThemeMode; readonly label: string }[] = [
    { value: 'system', label: $localize`:@@layout.themeSystem:Système` },
    { value: 'dark', label: $localize`:@@layout.themeDark:Sombre` },
    { value: 'light', label: $localize`:@@layout.themeLight:Clair` },
  ];

  /**
   * Property themeIcons
   * @readonly
   *
   * @description
   * Icon of each preference, as in the public menu.
   *
   * @type {Readonly<Record<ThemeMode, string>>}
   */
  protected readonly themeIcons: Readonly<Record<ThemeMode, string>> = {
    system: lucideMonitor,
    dark: lucideMoon,
    light: lucideSun,
  };
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Marks the administration document as unavailable to search crawlers, counts unread messages
   * on arrival and after each navigation, and connects the sidebar state to the narrow layout and
   * the sidebar panel.
   */
  public constructor() {
    inject<Meta>(Meta).updateTag({ name: 'robots', content: 'noindex, nofollow' });
    this.sidebarState.connect(
      this.narrow.asReadonly(),
      computed<string | null>((): string | null => this.sidebarPanel()?.id ?? null),
    );
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        void this.inboxSummary.refresh();
      });
    const destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
    this.watchWidth(destroyRef);
    this.watchScrollbar(destroyRef);
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
    this.document.defaultView?.open(this.siteHref, '_blank', 'noopener');
  }

  /**
   * Method themeLabel
   * @method themeLabel
   *
   * @description
   * Name of the current preference, for the menu button.
   *
   * @returns {string} Label.
   */
  protected themeLabel(): string {
    const mode: string =
      this.themes.find((option) => option.value === this.theme.mode())?.label ?? '';
    return $localize`:@@admin.shell.themeLabel:Thème : ${mode}:mode:`;
  }

  /**
   * Method unreadLabel
   * @method unreadLabel
   *
   * @description
   * Words read after the unread count, with the plural rules of the build locale (French keeps the
   * singular for 0 and 1, English for 1 only).
   *
   * @param {number} count - Unread messages.
   *
   * @returns {string} « non lu » or « non lus » in French, "unread" in English.
   */
  protected unreadLabel(count: number): string {
    return this.plurals.select(count) === 'one'
      ? $localize`:@@admin.shell.unread.one:non lu`
      : $localize`:@@admin.shell.unread.other:non lus`;
  }

  /**
   * Method languageLabel
   * @method languageLabel
   *
   * @description
   * Accessible name of the language trigger, which shows only a flag in the rail: the menu's name
   * and the current language.
   *
   * @returns {string} « Langue : Français » in French, "Language: English" in English.
   */
  protected languageLabel(): string {
    const language: string =
      this.languages.find((option) => option.value === this.locale)?.label ?? '';
    return $localize`:@@admin.shell.languageLabel:Langue : ${language}:language:`;
  }

  /**
   * Method switchLanguage
   * @method switchLanguage
   *
   * @description
   * Loads the same administration address from the other locale build (`/admin/…` ↔
   * `/en/admin/…`, `localeUrl`), as the public layout does. A full document load is needed, each
   * locale being a separate build; the session survives it (the refresh cookie is not tied to the
   * locale path).
   *
   * @param {unknown} language - Value chosen in the menu.
   */
  protected switchLanguage(language: unknown): void {
    if ((language !== 'fr' && language !== 'en') || language === this.locale) return;
    this.document.location.assign(localeUrl(this.router.url, language));
  }

  /**
   * Method setTheme
   * @method setTheme
   *
   * @description
   * Applies a preference chosen in the menu. The new theme opens in a circle from the menu trigger,
   * as on the public pages (`ThemeService.set`, mockup `data-ob-vt`).
   *
   * @param {unknown} mode - Value of the radio group.
   * @param {Element} origin - Theme menu trigger, centre of the transition.
   *
   * @returns {void}
   */
  protected setTheme(mode: unknown, origin: Element): void {
    if (mode === 'system' || mode === 'dark' || mode === 'light') this.theme.set(mode, origin);
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
      this.toasts.error(
        $localize`:@@admin.shell.logoutFailed:La déconnexion n’a pas été confirmée. Réessayez.`,
      );
    }
  }

  /**
   * Method saveSidebar
   * @method saveSidebar
   *
   * @description
   * Remembers the sidebar width after a drag, a key press or a reset on the separator; a width not
   * measured yet is not saved.
   *
   * @param {number | undefined} width - Sidebar width in pixels.
   */
  protected saveSidebar(width: number | undefined): void {
    if (!width) return;
    this.sidebarWidth.set(Math.round(width));
    this.layouts.writePixels(ADMIN_SIDEBAR_LAYOUT, width);
  }

  /**
   * Method toggleShortcut
   * @method toggleShortcut
   *
   * @description
   * Collapses or expands the sidebar on `[` outside fields and dialogs, from 1024 px up. The key is
   * matched on the character produced, Shift and Alt included (AZERTY layouts type `[` with AltGr or
   * Option); Ctrl and Cmd combinations are left to the browser, except Windows' AltGr, which reports
   * Ctrl and Alt together.
   *
   * @param {KeyboardEvent} event - Key press on the window.
   */
  protected toggleShortcut(event: KeyboardEvent): void {
    const target: Element | null = event.target instanceof Element ? event.target : null;
    const altGraph: boolean = event.getModifierState?.('AltGraph') ?? false;
    if (
      event.key !== '[' ||
      event.repeat ||
      event.defaultPrevented ||
      event.metaKey ||
      (event.ctrlKey && !altGraph) ||
      !this.sidebarState.available() ||
      target?.closest(
        'input, textarea, select, [contenteditable], [role="dialog"], [role="alertdialog"]',
      )
    ) {
      return;
    }
    event.preventDefault();
    this.sidebarState.toggle();
  }

  /**
   * Method settleSidebar
   * @method settleSidebar
   *
   * @description
   * Ends the toggle's width transition once the sidebar's own flex basis has finished or been
   * cancelled; transitions of its entries bubble here and are ignored.
   *
   * @param {TransitionEvent} event - Transition end or cancel on the sidebar or one of its entries.
   */
  protected settleSidebar(event: TransitionEvent): void {
    if (event.target === event.currentTarget && event.propertyName === 'flex-basis') {
      this.sidebarState.settle();
    }
  }

  /**
   * Method skipToContent
   * @method skipToContent
   *
   * @description
   * Moves the focus to the page from the skip link, without changing the URL.
   *
   * @param {Event} event - Activation of the skip link.
   * @param {HTMLElement} page - Main landmark holding the page.
   */
  protected skipToContent(event: Event, page: HTMLElement): void {
    event.preventDefault();
    page.focus();
  }

  /**
   * Method resetSidebar
   * @method resetSidebar
   *
   * @description
   * Restores the default sidebar width (232 px) on a double click of the separator, then saves it.
   *
   * @param {ResizablePanelGroupDirective} group - Group of the sidebar and the page.
   * @param {ResizableHandleComponent} handle - Separator between them.
   */
  protected resetSidebar(
    group: ResizablePanelGroupDirective,
    handle: ResizableHandleComponent,
  ): void {
    const width: number = ADMIN_SIDEBAR_LAYOUT.pixels.default;
    group.resizePixels(handle, width - (group.pixelSizes()[0] ?? width));
    group.commit();
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

  /**
   * Method watchScrollbar
   * @method watchScrollbar
   *
   * @description
   * Marks `<html>` as the administration's document and keeps the window scrollbar's width in
   * `--admin-scrollbar` (0 px without a classic scrollbar): the right margin that keeps the page clear
   * of the scrollbar under the viewport-wide container. A `ResizeObserver` on `<html>` follows the
   * scrollbar coming and going and every window resize; both marks leave with the layout.
   *
   * @param {DestroyRef} destroyRef - Lifetime of the layout, which removes the marks.
   */
  private watchScrollbar(destroyRef: DestroyRef): void {
    const root: HTMLElement = this.document.documentElement;
    const view: Window | null = this.document.defaultView;
    root.setAttribute(ADMIN_DOCUMENT_ATTRIBUTE, '');
    const measure: () => void = (): void => {
      const width: number = root.clientWidth;
      if (!view || width === 0) return;
      root.style.setProperty(ADMIN_SCROLLBAR_PROPERTY, `${Math.max(0, view.innerWidth - width)}px`);
    };
    measure();
    const observer: ResizeObserver | undefined =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(root);
    destroyRef.onDestroy((): void => {
      observer?.disconnect();
      root.removeAttribute(ADMIN_DOCUMENT_ATTRIBUTE);
      root.style.removeProperty(ADMIN_SCROLLBAR_PROPERTY);
    });
  }
  // #endregion
}
