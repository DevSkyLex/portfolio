import type { Subscription } from 'rxjs';
import { DOCUMENT } from '@angular/common';
import {
  type Signal,
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  LOCALE_ID,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { bootstrapLinkedin } from '@ng-icons/bootstrap-icons';
import { NgIcon } from '@ng-icons/core';
import { flagFr, flagGb } from '@ng-icons/flag-icons';
import {
  lucideFileDown,
  lucideGlobe,
  lucideMail,
  lucideMenu,
  lucideMonitor,
  lucideMoon,
  lucideSun,
  lucideX,
} from '@ng-icons/lucide';
import { simpleGithub, simpleMalt } from '@ng-icons/simple-icons';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PageSeoService, SiteLinksService } from '@vfortin/content-web-data-access';
import {
  type DecoGlyph,
  ButtonDirective,
  DecoComponent,
  MenuSelectComponent,
  MenuSelectIconDirective,
  type MenuSelectOption,
  SECTION_FX_CONTENT,
  SectionFxDirective,
} from '@vfortin/ui';
import {
  SPY_BOTTOM,
  SPY_TOP,
} from '@internal/web-shell/lib/layout/site-layout/constants/scroll-spy.constants';
import { SITE_DESCRIPTION } from '@internal/web-shell/lib/layout/site-layout/constants/site-description.constants';
import { FOOTER_GLYPHS } from '@internal/web-shell/lib/layout/site-layout/constants/footer-glyphs.constants';
import type { Language } from '@internal/web-shell/lib/layout/site-layout/models/language/language.type';
import type { NavItem } from '@internal/web-shell/lib/layout/site-layout/models/nav-item/nav-item.interface';
import { leafRoute } from '@internal/web-shell/lib/layout/site-layout/utils/leaf-route/leaf-route.utils';
import { ConsentService } from '@internal/web-shell/lib/consent/consent.service';
import { ConsentBannerComponent } from '@internal/web-shell/lib/layout/site-layout/components/consent-banner/consent-banner.component';
import type { ThemeMode } from '@internal/web-shell/lib/theme/models/theme-mode/theme-mode.type';
import { ThemeService } from '@internal/web-shell/lib/theme/theme.service';

/**
 * Component SiteLayoutComponent
 * @class SiteLayoutComponent
 *
 * @description
 * Provides the public site header, responsive navigation, routed content, and footer. It tracks the
 * active section and scroll progress, while routes marked with minimal footer data retain only the © band.
 * After hydration it reads the cookie choice; the consent banner is a deferred block loaded only when
 * a choice is needed or « Gérer les cookies » is used (D48), so prerendered pages never contain it.
 */
@Component({
  selector: 'app-site-layout',
  imports: [
    ButtonDirective,
    ConsentBannerComponent,
    DecoComponent,
    MenuSelectComponent,
    MenuSelectIconDirective,
    NgIcon,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    SectionFxDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-layout.component.html',
  host: {
    id: 'top',
    // Page container (mockup .ob-cq): breakpoints follow its width, the scrollbar excluded.
    class: '@container',
    '[class]': "minimal() ? 'flex min-h-screen flex-col' : 'block'",
  },
})
export class SiteLayoutComponent {
  // #region Properties
  /**
   * Property nav
   * @readonly
   *
   * @description
   * Localized in-page sections and colors used by the header progress indicator.
   *
   * @type {readonly NavItem[]}
   */
  protected readonly nav: readonly NavItem[] = [
    { fragment: 'projects', label: $localize`:@@nav.projects:Projets`, hue: 'var(--aurora-pink)' },
    {
      fragment: 'journey',
      label: $localize`:@@nav.timeline:Parcours`,
      hue: 'var(--aurora-violet)',
    },
    { fragment: 'skills', label: $localize`:@@nav.skills:Compétences`, hue: 'var(--aurora-blue)' },
    { fragment: 'about', label: $localize`:@@nav.about:À propos`, hue: 'var(--aurora-cyan)' },
    { fragment: 'contact', label: $localize`:@@nav.contact:Contact`, hue: 'var(--aurora-cyan)' },
  ];

  /**
   * Property links
   * @readonly
   *
   * @description
   * Public links of the content snapshot (e-mail in the menu and the footer, profiles in its
   * « Ailleurs » column), empty on a page rendered without the snapshot (error pages).
   *
   * @type {SiteLinksService}
   */
  protected readonly links: SiteLinksService = inject<SiteLinksService>(SiteLinksService);

  /**
   * Property linkIcons
   * @readonly
   *
   * @description
   * Icon of each profile link kind, the brand logos without their `<title>`.
   *
   * @type {Readonly<Record<string, string>>}
   */
  protected readonly linkIcons: Readonly<Record<string, string>> = {
    email: lucideMail,
    github: simpleGithub.replace(/<title>[^<]*<\/title>/, ''),
    linkedin: bootstrapLinkedin,
    malt: simpleMalt.replace(/<title>[^<]*<\/title>/, ''),
    website: lucideGlobe,
  };

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Icon registry for navigation, contact links, language flags, and download actions.
   */
  protected readonly icons: {
    readonly menu: typeof lucideMenu;
    readonly close: typeof lucideX;
    readonly mail: typeof lucideMail;
    readonly cv: typeof lucideFileDown;
    readonly flagFr: typeof flagFr;
    readonly flagGb: typeof flagGb;
  } = {
    menu: lucideMenu,
    close: lucideX,
    mail: lucideMail,
    cv: lucideFileDown,
    flagFr,
    flagGb,
  } as const;

  /**
   * Property themeIcons
   * @readonly
   *
   * @description
   * Icon map keyed by the three theme preference options.
   *
   * @type {Readonly<Record<string, string>>}
   */
  protected readonly themeIcons: Readonly<Record<string, string>> = {
    system: lucideMonitor,
    dark: lucideMoon,
    light: lucideSun,
  };

  /**
   * Property languages
   * @readonly
   *
   * @description
   * Language choices labeled in their own language for the locale selector.
   *
   * @type {readonly MenuSelectOption<Language>[]}
   */
  protected readonly languages: readonly MenuSelectOption<Language>[] = [
    { value: 'fr', label: 'Français', lang: 'fr' },
    { value: 'en', label: 'English', lang: 'en' },
  ];

  /**
   * Property themes
   * @readonly
   *
   * @description
   * Localized appearance preferences exposed by the theme selector.
   *
   * @type {readonly MenuSelectOption<ThemeMode>[]}
   */
  protected readonly themes: readonly MenuSelectOption<ThemeMode>[] = [
    { value: 'system', label: $localize`:@@layout.themeSystem:Système` },
    { value: 'dark', label: $localize`:@@layout.themeDark:Sombre` },
    { value: 'light', label: $localize`:@@layout.themeLight:Clair` },
  ];

  /**
   * Property footerGlyphs
   * @readonly
   *
   * @description
   * Decorative footer glyphs positioned in the page margins.
   *
   * @type {readonly DecoGlyph[]}
   */
  protected readonly footerGlyphs: readonly DecoGlyph[] = FOOTER_GLYPHS;

  /**
   * Property sectionFx
   * @readonly
   *
   * @description
   * Shared section effect configuration applied to the public site layout.
   *
   * @type {typeof SECTION_FX_CONTENT}
   */
  protected readonly sectionFx: typeof SECTION_FX_CONTENT = SECTION_FX_CONTENT;

  /**
   * Property link
   * @readonly
   *
   * @description
   * Shared visual classes for footer links.
   *
   * @type {string}
   */
  protected readonly link: string =
    'inline-flex min-h-9 items-center text-[15px]/5 text-fg-muted transition-colors duration-(--dur-pop) ease-orbit hover:text-fg focus-visible:text-fg';

  /**
   * Property bandLink
   * @readonly
   *
   * @description
   * Compact visual classes for links in the © band.
   *
   * @type {string}
   */
  protected readonly bandLink: string =
    'inline-flex min-h-11 items-center text-[13px]/5 text-fg-muted transition-colors duration-(--dur-pop) ease-orbit hover:text-fg focus-visible:text-fg';

  /**
   * Property theme
   * @readonly
   *
   * @description
   * Theme state and update operations used by the appearance menu.
   *
   * @type {ThemeService}
   */
  protected readonly theme: ThemeService = inject<ThemeService>(ThemeService);

  /**
   * Property consent
   * @readonly
   *
   * @description
   * Cookie choice: shows the banner and the « Gérer les cookies » link when the audience measurement
   * is configured (D48).
   *
   * @type {ConsentService}
   */
  protected readonly consent: ConsentService = inject<ConsentService>(ConsentService);

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Supported locale normalized from Angular's locale identifier.
   *
   * @type {Language}
   */
  protected readonly locale: Language = inject<string>(LOCALE_ID).startsWith('en') ? 'en' : 'fr';

  /**
   * Property minimal
   * @readonly
   *
   * @description
   * Whether the active page requests the compact footer used by error routes.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly minimal: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property year
   * @readonly
   *
   * @description
   * Current year shown in the site's © band.
   *
   * @type {number}
   */
  protected readonly year: number = new Date().getFullYear();

  /**
   * Property scrolled
   * @readonly
   *
   * @description
   * Whether the scroll position is beyond the threshold for the compact header.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly scrolled: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property active
   * @readonly
   *
   * @description
   * Section currently intersecting the scroll-spy reading band, retained until another section takes over.
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly active: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property menuOpen
   * @readonly
   *
   * @description
   * Whether the mobile navigation dialog is currently open.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly menuOpen: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property header
   * @readonly
   *
   * @description
   * Required header element whose CSS variables track scroll progress and active section color.
   *
   * @type {Signal<ElementRef<HTMLElement>>}
   */
  private readonly header: Signal<ElementRef<HTMLElement>> =
    viewChild.required<ElementRef<HTMLElement>>('header');

  /**
   * Property menu
   * @readonly
   *
   * @description
   * Required mobile navigation dialog controlled with the native modal API.
   *
   * @type {Signal<ElementRef<HTMLDialogElement>>}
   */
  private readonly menu: Signal<ElementRef<HTMLDialogElement>> =
    viewChild.required<ElementRef<HTMLDialogElement>>('menu');

  /**
   * Property menuButton
   * @readonly
   *
   * @description
   * Optional menu trigger used to restore keyboard focus after the dialog closes.
   *
   * @type {Signal<ElementRef<HTMLButtonElement> | undefined>}
   */
  private readonly menuButton: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('menuButton');

  /**
   * Property document
   * @readonly
   *
   * @description
   * Browser document used for scroll, focus, and locale navigation behavior.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Router observed for footer metadata and navigation changes.
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Sets localized page metadata, tracks route and scroll state in the browser, and unregisters all
   * listeners and subscriptions when the layout is destroyed.
   */
  public constructor() {
    inject<PageSeoService>(PageSeoService).setSiteDescription(SITE_DESCRIPTION);
    const destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
    const router: Router = this.router;

    // Also on the server: the prerendered error pages carry the reduced footer.
    const footer: Subscription = router.events.subscribe((event) => {
      if (event instanceof NavigationEnd)
        this.minimal.set(leafRoute(router.routerState.snapshot.root).data['footer'] === 'minimal');
    });
    destroyRef.onDestroy(() => footer.unsubscribe());
    afterNextRender(() => {
      const view: (Window & typeof globalThis) | null = this.document.defaultView;
      if (!view) return;
      // After hydration only: the stored choice never shapes the prerendered page (D48).
      this.consent.restore();
      let frame: number = 0;
      /**
       * Function schedule
       *
       * @description
       * Coalesces scroll and resize events into one animation-frame update.
       *
       * @returns {void} Requests an animation frame only when one is not already pending.
       */
      const schedule = (): void => {
        if (!frame) frame = view.requestAnimationFrame(update);
      };
      /**
       * Function update
       *
       * @description
       * Recomputes header density, closes an open mobile dialog at desktop width, and updates section
       * and page progress indicators from the current viewport state.
       *
       * @returns {void} Writes the derived scroll state to signals and header CSS properties.
       */
      const update = (): void => {
        frame = 0;
        const root: HTMLElement = this.document.documentElement;
        const y: number = view.scrollY;
        const max: number = root.scrollHeight - view.innerHeight;
        this.scrolled.set(y > 8);

        // The menu only exists below 1024px: a modal left open on a wider window would block the page.
        if (this.document.documentElement.clientWidth >= 1024) this.closeMenu();
        this.spy(view);
        const style: CSSStyleDeclaration = this.header().nativeElement.style;
        style.setProperty('--hp', max > 0 ? Math.min(1, Math.max(0, y / max)).toFixed(4) : '0');
        const current: NavItem | undefined = this.nav.find(
          (item) => item.fragment === this.active(),
        );
        style.setProperty('--hc', current?.hue ?? 'var(--fg-faint)');
      };
      const navigation: Subscription = router.events.subscribe((event) => {
        if (!(event instanceof NavigationEnd)) return;
        this.active.set(null);
        this.closeMenu();
        schedule();
      });
      view.addEventListener('scroll', schedule, { passive: true });
      view.addEventListener('resize', schedule);
      update();
      destroyRef.onDestroy(() => {
        if (frame) view.cancelAnimationFrame(frame);
        navigation.unsubscribe();
        view.removeEventListener('scroll', schedule);
        view.removeEventListener('resize', schedule);
        this.lockScroll(false);
      });
    });
  }
  // #endregion

  // #region Methods
  /**
   * Method switchLanguage
   * @method switchLanguage
   *
   * @description
   * Loads the equivalent path under the selected locale prefix; a full document load switches between
   * the separately built French and English site outputs.
   *
   * @param {Language} language - Locale selected by the visitor.
   *
   * @returns {void} Does nothing for the active locale; otherwise starts full-document navigation to the selected locale.
   */
  protected switchLanguage(language: Language): void {
    if (language === this.locale) return;
    const path: string = this.router.url;
    this.document.location.assign(`/${language}${path}`);
  }

  /**
   * Method openMenu
   * @method openMenu
   *
   * @description
   * Opens the native modal menu, records its open state, and locks document scrolling.
   *
   * @returns {void} Opens the dialog and prevents background scrolling.
   */
  protected openMenu(): void {
    this.menu().nativeElement.showModal();
    this.menuOpen.set(true);
    this.lockScroll(true);
  }

  /**
   * Method closeMenu
   * @method closeMenu
   *
   * @description
   * Closes the mobile dialog when open; its close event handles state, scroll, and focus cleanup.
   *
   * @returns {void} Requests dialog closure when the menu is currently open.
   */
  protected closeMenu(): void {
    if (this.menuOpen()) this.menu().nativeElement.close();
  }

  /**
   * Method menuClosed
   * @method menuClosed
   *
   * @description
   * Clears modal state, unlocks document scrolling, and restores focus to the menu trigger.
   *
   * @returns {void} Restores page scrolling and keyboard focus after dialog closure.
   */
  protected menuClosed(): void {
    this.menuOpen.set(false);
    this.lockScroll(false);
    this.menuButton()?.nativeElement.focus();
  }

  /**
   * Method spy
   * @method spy
   *
   * @description
   * Updates the active navigation section when its element intersects the reading band. Elements are
   * looked up on each scroll because deferred sections replace placeholders after hydration.
   *
   * @param {Window} view - Browser window supplying viewport dimensions for the reading band.
   *
   * @returns {void} Updates the active section when one intersects the reading band.
   */
  private spy(view: Window): void {
    const root: HTMLElement = this.document.documentElement;
    if (root.scrollHeight <= view.innerHeight + 40) return;
    const top: number = view.innerHeight * SPY_TOP;
    const bottom: number = view.innerHeight * SPY_BOTTOM;
    for (const item of this.nav) {
      const rect: DOMRect | undefined = this.document
        .getElementById(item.fragment)
        ?.getBoundingClientRect();
      if (rect && rect.top < bottom && rect.bottom > top) {
        this.active.set(item.fragment);
        return;
      }
    }
  }

  /**
   * Method lockScroll
   * @method lockScroll
   *
   * @description
   * Prevents background document scrolling while the modal navigation is open.
   *
   * @param {boolean} locked - Whether to disable root scrolling.
   *
   * @returns {void} Sets the document root overflow style to match the requested lock state.
   */
  private lockScroll(locked: boolean): void {
    this.document.documentElement.style.overflow = locked ? 'hidden' : '';
  }
  // #endregion
}
