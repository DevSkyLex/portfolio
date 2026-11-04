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
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
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
import { RevealDirective, ScrollProgressDirective } from '@vfortin/ui';
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
    // Runs after the sections of the current article are in the DOM; the cleanup releases the
    // observer of the previous article, and the last one on destruction.
    afterRenderEffect((onCleanup: (cleanup: () => void) => void): void => {
      if (this.sections().length === 0) return;
      const window: (Window & typeof globalThis) | null = document.defaultView;
      if (window) onCleanup(this.spy(window));
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
   * Observes article sections crossing the table-of-contents viewport band and returns cleanup for the observer; short pages skip active-section updates and unsupported browsers skip observation.
   *
   * @param {Window} window - Window owning the rendered article document.
   *
   * @returns {() => void} Cleanup callback that disconnects the observer.
   */
  private spy(window: Window): () => void {
    if (typeof IntersectionObserver === 'undefined') return (): undefined => undefined;
    const root: HTMLElement = window.document.documentElement;
    const observer: IntersectionObserver = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]): void => {
        if (root.scrollHeight <= window.innerHeight + 40) return;
        for (const entry of entries) {
          if (entry.isIntersecting) this.active.set(entry.target.id);
        }
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    this.host
      .querySelectorAll('[data-spy]')
      .forEach((section: Element): void => observer.observe(section));
    return (): void => observer.disconnect();
  }
  // #endregion
}
