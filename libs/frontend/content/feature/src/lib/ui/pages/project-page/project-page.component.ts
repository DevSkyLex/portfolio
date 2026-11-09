import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { Router, RouterLink, Scroll } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { lucideArrowLeft, lucideArrowRight, lucideSquareArrowOutUpRight } from '@ng-icons/lucide';
import { PageSeoService, SiteContentService } from '@vfortin/content-web-data-access';
import {
  ARTICLE_TYPOGRAPHY,
  ArticleBlocksComponent,
  AsciiPlanetComponent,
  TechIconComponent,
  imageSrcset,
  techDefinition,
} from '@vfortin/content-web-ui';
import { RevealDirective, ScrollFrameService, ScrollProgressDirective } from '@vfortin/ui';
import type { Subscription } from 'rxjs';
import { PROJECT_ARROW_CLASSES } from '@internal/content-web-feature/lib/ui/pages/project-page/constants/project-arrow-classes.constants';
import { PROJECT_ENTER_CLASSES } from '@internal/content-web-feature/lib/ui/pages/project-page/constants/project-enter-classes.constants';
import { PROJECT_REVEAL_CLASSES } from '@internal/content-web-feature/lib/ui/pages/project-page/constants/project-reveal-classes.constants';
import { PROJECT_VISUAL_TINTS } from '@internal/content-web-feature/lib/ui/pages/project-page/constants/project-visual-tints.constants';

/**
 * Component ProjectPageComponent
 * @class ProjectPageComponent
 *
 * @description
 * Renders the selected case study from its article document (D40): the introduction, one section per
 * level-2 heading with its table-of-contents entry and scrollspy, and links to adjacent articles.
 */
@Component({
  selector: 'content-project-page',
  imports: [
    ArticleBlocksComponent,
    AsciiPlanetComponent,
    NgIcon,
    RevealDirective,
    RouterLink,
    ScrollProgressDirective,
    TechIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-page.component.html',
})
export class ProjectPageComponent {
  // #region Properties
  /**
   * Property slug
   * @readonly
   *
   * @description
   * Required project slug bound from the router parameter.
   *
   * @type {InputSignal<string>}
   */
  public readonly slug: InputSignal<string> = input.required<string>();

  /**
   * Property content
   * @readonly
   *
   * @description
   * Public content service used to resolve the route article and its neighbours.
   *
   * @type {SiteContentService}
   */
  private readonly content: SiteContentService = inject<SiteContentService>(SiteContentService);

  /**
   * Property host
   * @readonly
   *
   * @description
   * Host element queried for article sections observed by the table-of-contents scrollspy.
   *
   * @type {HTMLElement}
   */
  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property project
   * @readonly
   *
   * @description
   * Article matching the current slug, or `null` when the route refers to no project.
   *
   * @type {Signal<ProjectArticle | null>}
   */
  protected readonly project: Signal<ReturnType<SiteContentService['project']>> = computed<
    ReturnType<SiteContentService['project']>
  >(() => this.content.project(this.slug()));

  /**
   * Property sections
   * @readonly
   *
   * @description
   * Sections of the current article; a new array whenever the route moves to another project, which
   * restarts the scrollspy.
   *
   * @type {Signal<NonNullable<ReturnType<SiteContentService['project']>>['sections']>}
   */
  protected readonly sections: Signal<
    NonNullable<ReturnType<SiteContentService['project']>>['sections']
  > = computed<NonNullable<ReturnType<SiteContentService['project']>>['sections']>(
    (): NonNullable<ReturnType<SiteContentService['project']>>['sections'] =>
      this.project()?.sections ?? [],
  );

  /**
   * Property neighbours
   * @readonly
   *
   * @description
   * Previous and next articles in the content service's navigation order.
   *
   * @type {Signal<{ previous: ProjectArticle; next: ProjectArticle } | null>}
   */
  protected readonly neighbours: Signal<ReturnType<SiteContentService['neighbours']>> = computed<
    ReturnType<SiteContentService['neighbours']>
  >(() => this.content.neighbours(this.slug()));

  /**
   * Property tint
   * @readonly
   *
   * @description
   * Placeholder background, used without a cover, selected by the project's index in the full content
   * order.
   *
   * @type {Signal<string | undefined>}
   */
  protected readonly tint: Signal<string | undefined> = computed<string | undefined>(() => {
    const index: number = this.content.slugs().indexOf(this.slug());
    return PROJECT_VISUAL_TINTS[Math.max(index, 0) % PROJECT_VISUAL_TINTS.length];
  });

  /**
   * Property active
   * @readonly
   *
   * @description
   * Identifier of the section marked in the table of contents; back on the first section whenever the
   * article changes, `null` for an article without sections.
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly active: WritableSignal<string | null> = linkedSignal<string | null>(
    (): string | null => this.sections()[0]?.id ?? null,
  );

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Icon glyphs used for back, next, and external project links.
   *
   * @type {{ back: typeof lucideArrowLeft; next: typeof lucideArrowRight; external: typeof lucideSquareArrowOutUpRight }}
   */
  protected readonly icons: {
    back: typeof lucideArrowLeft;
    next: typeof lucideArrowRight;
    external: typeof lucideSquareArrowOutUpRight;
  } = {
    back: lucideArrowLeft,
    next: lucideArrowRight,
    external: lucideSquareArrowOutUpRight,
  };

  /**
   * Property typography
   * @readonly
   *
   * @description
   * Classes of the article nodes, shared with the renderer and the administrator editor.
   *
   * @type {typeof ARTICLE_TYPOGRAPHY}
   */
  protected readonly typography: typeof ARTICLE_TYPOGRAPHY = ARTICLE_TYPOGRAPHY;

  /**
   * Property enter
   * @readonly
   *
   * @description
   * Classes for the hero entrance animation, with `--rd` controlling each line's stagger delay.
   *
   * @type {string}
   */
  protected readonly enter: string = PROJECT_ENTER_CLASSES;

  /**
   * Property reveal
   * @readonly
   *
   * @description
   * Classes for the one-time scroll reveal controlled by `uiReveal` and its `data-in` state.
   *
   * @type {string}
   */
  protected readonly reveal: string = PROJECT_REVEAL_CLASSES;

  /**
   * Property arrow
   * @readonly
   *
   * @description
   * Shared link-arrow classes for hover movement and text-color transition.
   *
   * @type {string}
   */
  protected readonly arrow: string = PROJECT_ARROW_CLASSES;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Writes the article's search and sharing metadata (D42) whenever the route moves to another
   * project, prerendering included, and removes them when the page leaves; in the browser, observes the
   * rendered sections again after every change of article.
   */
  public constructor() {
    const seo: PageSeoService = inject<PageSeoService>(PageSeoService);
    effect((): void => {
      const project: ReturnType<SiteContentService['project']> = this.project();
      if (project) seo.project(project);
    });
    inject<DestroyRef>(DestroyRef).onDestroy((): void => seo.clear());

    const document: Document = inject<Document>(DOCUMENT);
    const frames: ScrollFrameService = inject<ScrollFrameService>(ScrollFrameService);
    const router: Router = inject<Router>(Router);
    // Runs after the sections of the current article are in the DOM; the cleanup releases the
    // scroll task of the previous article, and the last one on destruction.
    afterRenderEffect((onCleanup: (cleanup: () => void) => void): void => {
      if (this.sections().length === 0) return;
      const window: (Window & typeof globalThis) | null = document.defaultView;
      if (window) onCleanup(untracked(() => this.spy(window, frames, router)));
    });
  }
  // #endregion

  // #region Methods
  /**
   * Method techLabel
   * @method techLabel
   *
   * @description
   * Resolves a technology catalogue key to the label displayed on the article page.
   *
   * @param {string} tech - Technology key from the project article.
   *
   * @returns {string} Catalogue label, including the catalogue's fallback for unknown keys.
   */
  protected techLabel(tech: string): string {
    return techDefinition(tech).label;
  }

  /**
   * Method srcset
   * @method srcset
   *
   * @description
   * Lists the renditions of the cover shown at the top of the article.
   *
   * @param {NonNullable<NonNullable<ReturnType<SiteContentService['project']>>['cover']>} image - Project cover.
   *
   * @returns {string | null} `srcset` value, or `null` without a 960 px rendition.
   */
  protected srcset(
    image: NonNullable<NonNullable<ReturnType<SiteContentService['project']>>['cover']>,
  ): string | null {
    return imageSrcset(image);
  }

  /**
   * Method spy
   * @method spy
   *
   * @description
   * Marks the last section to reach the reading line. While following a fragment, keeps its title
   * in place if blocks above it change size after hydration.
   *
   * @param {Window} window - Window owning the rendered article document.
   * @param {ScrollFrameService} frames - Shared scroll and resize scheduler.
   * @param {Router} router - Source of fragment navigation and history restoration events.
   *
   * @returns {() => void} Cleanup callback for the scroll task, observation and listeners.
   */
  private spy(
    window: Window & typeof globalThis,
    frames: ScrollFrameService,
    router: Router,
  ): () => void {
    const sections: HTMLElement[] = Array.from(
      this.host.querySelectorAll<HTMLElement>('[data-spy]'),
    ).reverse();
    const first: HTMLElement | undefined = sections.at(-1);
    if (!first) return (): void => undefined;
    const root: HTMLElement = window.document.documentElement;
    const target = (id: string | null): HTMLElement | undefined =>
      sections.find((element: HTMLElement): boolean => element.id === id);
    let anchored: HTMLElement | undefined = target(router.routerState.snapshot.root.fragment);
    let previousTop: number | null = null;
    let destination: number | null = null;
    let next: string = first.id;
    const remove: () => void = frames.add({
      read: (): void => {
        destination = null;
        const scrollLimit: number = root.scrollHeight - window.innerHeight;
        if (scrollLimit <= 0) {
          next = first.id;
          return;
        }
        const offset: number =
          Number.parseFloat(window.getComputedStyle(first).scrollMarginTop) || 0;
        if (anchored) {
          const scrollY: number = window.scrollY;
          const top: number = anchored.getBoundingClientRect().top + scrollY;
          const desired: number = Math.max(0, Math.min(top - offset, scrollLimit));
          const moved: boolean = previousTop === null || top !== previousTop;
          previousTop = top;
          if (Math.abs(desired - scrollY) > 1) {
            if (moved) {
              destination = desired;
              next = anchored.id;
              return;
            }
            // A new scroll position with unchanged layout means the reader has moved on.
            anchored = undefined;
          }
        }
        // Fractional CSS positions can round to a neighbouring pixel when the browser scrolls.
        const section: HTMLElement | undefined = sections.find(
          (element: HTMLElement): boolean => element.getBoundingClientRect().top <= offset + 1,
        );
        next = section?.id ?? first.id;
      },
      write: (): boolean => {
        if (destination !== null) window.scrollTo({ top: destination, behavior: 'instant' });
        const changed: boolean = this.active() !== next;
        if (changed) this.active.set(next);
        return changed || destination !== null;
      },
    });
    const navigation: Subscription = router.events.subscribe((event): void => {
      if (!(event instanceof Scroll)) return;
      anchored = event.position ? undefined : target(event.anchor);
      previousTop = null;
      frames.request();
    });
    const interactions: AbortController = new window.AbortController();
    const release = (): void => {
      anchored = undefined;
    };
    for (const event of ['wheel', 'touchmove', 'pointerdown', 'keydown']) {
      window.addEventListener(event, release, { passive: true, signal: interactions.signal });
    }
    const observer: ResizeObserver | null =
      typeof window.ResizeObserver === 'undefined'
        ? null
        : new window.ResizeObserver(frames.request);
    for (const section of sections) observer?.observe(section);
    observer?.observe(root);
    return (): void => {
      observer?.disconnect();
      interactions.abort();
      navigation.unsubscribe();
      remove();
    };
  }
  // #endregion
}
