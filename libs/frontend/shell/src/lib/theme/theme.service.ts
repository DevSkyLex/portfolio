import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  type Signal,
  type WritableSignal,
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  THEME_MODES,
  THEME_STORAGE_KEY,
} from '@internal/web-shell/lib/theme/constants/theme.constants';
import type { Theme } from '@internal/web-shell/lib/theme/models/theme/theme.type';
import type { ThemeMode } from '@internal/web-shell/lib/theme/models/theme-mode/theme-mode.type';

/**
 * Service ThemeService
 * @class ThemeService
 *
 * @description
 * Resolves the selected theme, persists user choices when storage is available, and applies the
 * result to the document root. Dark is the default; view transitions originate from the control
 * that changed the theme.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  // #region Properties
  /**
   * Property document
   * @readonly
   *
   * @description
   * Document root updated with the resolved theme and transition metadata.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property view
   * @readonly
   *
   * @description
   * Browser window used for storage and media queries, or `null` during server rendering.
   *
   * @type {Window | null}
   */
  private readonly view: Window | null = isPlatformBrowser(inject<object>(PLATFORM_ID))
    ? this.document.defaultView
    : null;

  /**
   * Property media
   * @readonly
   *
   * @description
   * Light-scheme media query when `matchMedia` is available.
   *
   * @type {MediaQueryList | null}
   */
  private readonly media: MediaQueryList | null =
    this.view?.matchMedia?.('(prefers-color-scheme: light)') ?? null;

  /**
   * Property systemLight
   * @readonly
   *
   * @description
   * Current light-scheme preference, initialized from the media query when available.
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly systemLight: WritableSignal<boolean> = signal<boolean>(
    this.media?.matches ?? false,
  );

  /** Keeps the registered callback stable so its owner can release the media listener. */
  private readonly onSystemChange: (event: MediaQueryListEvent) => void = (
    event: MediaQueryListEvent,
  ): void => this.systemLight.set(event.matches);

  /**
   * Property mode
   * @readonly
   *
   * @description
   * Selected preference restored from storage when possible and defaulting to dark.
   *
   * @type {WritableSignal<ThemeMode>}
   */
  public readonly mode: WritableSignal<ThemeMode> = signal<ThemeMode>(this.read());

  /**
   * Property theme
   * @readonly
   *
   * @description
   * Concrete theme derived from the selection and system preference.
   *
   * @type {Signal<Theme>}
   */
  public readonly theme: Signal<Theme> = computed<Theme>(() => {
    const mode: ThemeMode = this.mode();
    if (mode === 'system') return this.systemLight() ? 'light' : 'dark';
    return mode;
  });
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Tracks system preference changes and applies each resolved theme to the document.
   */
  public constructor() {
    this.media?.addEventListener?.('change', this.onSystemChange);
    inject<DestroyRef>(DestroyRef).onDestroy((): void => {
      this.media?.removeEventListener?.('change', this.onSystemChange);
    });
    effect(() => this.apply(this.theme()));
  }
  // #endregion

  // #region Methods
  /**
   * Method set
   * @method set
   *
   * @description
   * Persists a preference when browser storage permits and updates the document theme. When the
   * concrete theme changes and reduced motion is off, the supplied origin anchors a circular transition.
   *
   * @param {ThemeMode} mode - Preference to apply and store.
   * @param {Element | null} [origin] - Element whose center anchors the transition when provided.
   *
   * @returns {void} Applies the preference to the document; storage failures leave it active only for this page.
   */
  public set(mode: ThemeMode, origin?: Element | null): void {
    try {
      this.view?.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Storage refused (private mode): the choice lasts for the page only.
    }
    const next: 'dark' | 'light' =
      mode === 'system' ? (this.systemLight() ? 'light' : 'dark') : mode;
    const root: HTMLElement = this.document.documentElement;
    const reduced: boolean =
      this.view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
    if (next === this.theme() || reduced || !origin || !this.document.startViewTransition) {
      this.mode.set(mode);
      return;
    }
    const rect: DOMRect = origin.getBoundingClientRect();
    root.style.setProperty('--vt-x', `${Math.round(rect.left + rect.width / 2)}px`);
    root.style.setProperty('--vt-y', `${Math.round(rect.top + rect.height / 2)}px`);
    root.setAttribute('data-theme-vt', '');
    const transition: ViewTransition = this.document.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          this.mode.set(mode);
          this.apply(next);

          // Leaves the menus time to render their new value before the snapshot.
          setTimeout(resolve, 50);
        }),
    );
    void transition.finished.finally(() => root.removeAttribute('data-theme-vt'));
  }

  /**
   * Method read
   * @method read
   *
   * @description
   * Restores a recognized preference from browser storage; failures and unknown values use dark.
   *
   * @returns {ThemeMode} Stored preference, or `dark` when none is usable.
   */
  private read(): ThemeMode {
    try {
      const stored: string | null | undefined = this.view?.localStorage.getItem(THEME_STORAGE_KEY);
      return THEME_MODES.find((mode) => mode === stored) ?? 'dark';
    } catch {
      return 'dark';
    }
  }

  /**
   * Method apply
   * @method apply
   *
   * @description
   * Sets `data-theme` on the browser document root when the value changes. It briefly toggles
   * overflow to repaint Chrome's scrollbar after applying a theme.
   *
   * @param {Theme} theme - Concrete theme to apply.
   *
   * @returns {void} Updates the browser root attribute when needed; server rendering leaves the document unchanged.
   */
  private apply(theme: Theme): void {
    const root: HTMLElement = this.document.documentElement;
    if (!this.view || root.getAttribute('data-theme') === theme) return;
    root.setAttribute('data-theme', theme);

    // Chrome does not repaint the scrollbar when its colours change: remove and restore it in the same frame.
    if (!root.style.overflow) {
      root.style.overflow = 'hidden';
      void root.offsetWidth;
      root.style.overflow = '';
    }
  }
  // #endregion
}
