import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  type Signal,
  type InputSignal,
  type WritableSignal,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { lucideArrowLeft, lucideArrowRight, lucideSquareArrowOutUpRight } from '@ng-icons/lucide';
import { SiteContentService } from '@vfortin/content-web-data-access';
import { AsciiPlanetComponent, TechIconComponent, techDefinition } from '@vfortin/content-web-ui';
import { RevealDirective, ScrollProgressDirective } from '@vfortin/ui';
import { PROJECT_ARROW_CLASSES } from '@internal/content-web-feature/lib/ui/pages/project-page/constants/project-arrow-classes.constants';
import { PROJECT_ENTER_CLASSES } from '@internal/content-web-feature/lib/ui/pages/project-page/constants/project-enter-classes.constants';
import { PROJECT_REVEAL_CLASSES } from '@internal/content-web-feature/lib/ui/pages/project-page/constants/project-reveal-classes.constants';
import { PROJECT_VISUAL_TINTS } from '@internal/content-web-feature/lib/ui/pages/project-page/constants/project-visual-tints.constants';
import type { ProjectSectionId } from '@internal/content-web-feature/lib/ui/pages/project-page/models/project-section-id/project-section-id.type';
import type { ProjectTocEntry } from '@internal/content-web-feature/lib/ui/pages/project-page/models/project-toc-entry/project-toc-entry.interface';

/**
 * Component ProjectPageComponent
 * @class ProjectPageComponent
 *
 * @description
 * Renders the selected case study, maintains its section table of contents, and links to adjacent articles.
 */
@Component({
  selector: 'content-project-page',
  imports: [
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
   * Placeholder background selected by the project's index in the full content order.
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
   * Section currently marked in the table of contents, initialized to the first article section.
   *
   * @type {WritableSignal<ProjectSectionId>}
   */
  protected readonly active: WritableSignal<ProjectSectionId> = signal<ProjectSectionId>('context');

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
   * Property labels
   * @readonly
   *
   * @description
   * Localized section labels shared by article headings and the table of contents.
   *
   * @type {Readonly<Record<ProjectSectionId, string>>}
   */
  protected readonly labels: Readonly<Record<ProjectSectionId, string>> = {
    context: $localize`:@@project.context:Contexte`,
    work: $localize`:@@project.work:Ce que j'ai fait`,
    choices: $localize`:@@project.choices:Choix techniques`,
    result: $localize`:@@project.result:Résultat`,
    lessons: $localize`:@@project.lessons:Ce que je retiens`,
  };

  /**
   * Property toc
   * @readonly
   *
   * @description
   * Ordered section identifiers and labels rendered as table-of-contents links.
   *
   * @type {readonly ProjectTocEntry[]}
   */
  protected readonly toc: readonly ProjectTocEntry[] = (
    Object.keys(this.labels) as ProjectSectionId[]
  ).map((id: ProjectSectionId): { id: ProjectSectionId; label: string } => ({
    id,
    label: this.labels[id],
  }));

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
   * Updates the document title when the article resolves, starts the scrollspy after rendering, and resets the active section when the route slug changes.
   */
  public constructor() {
    const title: Title = inject<Title>(Title);
    effect((): void => {
      const project: ReturnType<SiteContentService['project']> = this.project();
      if (project) {
        title.setTitle(`${project.title} — Valentin Fortin`);
      }
    });

    const document: Document = inject<Document>(DOCUMENT);
    const destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
    afterNextRender((): void => {
      const window: (Window & typeof globalThis) | null = document.defaultView;
      if (!window) return;
      destroyRef.onDestroy(this.spy(window));
    });

    // Another project in the same component: back to the first section.
    effect((): void => {
      this.slug();
      this.active.set('context');
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
          if (entry.isIntersecting) this.active.set(entry.target.id as ProjectSectionId);
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
