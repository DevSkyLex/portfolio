import { Injectable, LOCALE_ID, computed, inject, type Signal } from '@angular/core';
import type { ContentSnapshot } from '@vfortin/content-contracts';
import type { ProjectArticle, SiteContent } from '@vfortin/content-web-model';
import { toSiteContent } from '@internal/content-web-data-access/lib/adapters/content/content.adapter';
import type { ContentSnapshots } from '@internal/content-web-data-access/lib/models/content-snapshots/content-snapshots.type';
import type { ProjectNeighbours } from '@internal/content-web-data-access/lib/models/project-neighbours/project-neighbours.interface';
import { CONTENT_SNAPSHOT_VALIDATOR } from '@internal/content-web-data-access/lib/tokens/content-snapshot/content-snapshot-validator.token';
import { CONTENT_SNAPSHOTS } from '@internal/content-web-data-access/lib/tokens/content-snapshot/content-snapshots.token';
import { articleOrder } from '@internal/content-web-data-access/lib/utils/article-order/article-order.utils';
import { localeOf } from '@internal/content-web-data-access/lib/utils/site-locale/site-locale.utils';

/**
 * Service SiteContentService
 * @class SiteContentService
 *
 * @description
 * Exposes synchronous, read-only view models from the prerender snapshot for the active locale; snapshots are validated during server rendering (D10).
 */
@Injectable({ providedIn: 'root' })
export class SiteContentService {
  // #region Properties
  /**
   * Property content
   * @readonly
   *
   * @description
   * Projected public content snapshot selected from the active locale.
   *
   * @type {SiteContent}
   */
  private readonly content: SiteContent;

  /**
   * Property articles
   * @readonly
   *
   * @description
   * Project articles kept in the order used by previous and next article navigation.
   *
   * @type {readonly ProjectArticle[]}
   */
  private readonly articles: readonly ProjectArticle[];
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Selects the locale snapshot, applies the optional server validator, and prepares the public projection and article order.
   */
  public constructor() {
    const locale: SiteContent['locale'] = localeOf(inject<string>(LOCALE_ID));
    const snapshot: unknown = inject<ContentSnapshots>(CONTENT_SNAPSHOTS)[locale];

    // Validated at prerender time (an invalid snapshot breaks the build); the browser reads the same files.
    const validate: (value: unknown) => ContentSnapshot =
      inject<(value: unknown) => ContentSnapshot>(CONTENT_SNAPSHOT_VALIDATOR, { optional: true }) ??
      ((value: unknown): ContentSnapshot => value as ContentSnapshot);
    this.content = toSiteContent(validate(snapshot));
    this.articles = articleOrder(this.content.projects);
  }
  // #endregion

  // #region Properties
  /**
   * Property profile
   * @readonly
   *
   * @description
   * Computed view of the active locale's profile copy.
   *
   * @type {Signal<Profile>}
   */
  public readonly profile: Signal<SiteContent['profile']> = computed<SiteContent['profile']>(
    () => this.content.profile,
  );

  /**
   * Property projects
   * @readonly
   *
   * @description
   * Computed view of all project articles in the active locale.
   *
   * @type {Signal<readonly ProjectArticle[]>}
   */
  public readonly projects: Signal<readonly ProjectArticle[]> = computed<readonly ProjectArticle[]>(
    (): readonly ProjectArticle[] => this.content.projects,
  );

  /**
   * Property featuredProject
   * @readonly
   *
   * @description
   * First featured project, or `null` when no project is marked featured.
   *
   * @type {Signal<ProjectArticle | null>}
   */
  public readonly featuredProject: Signal<ProjectArticle | null> = computed<ProjectArticle | null>(
    (): ProjectArticle | null =>
      this.content.projects.find((p: ProjectArticle): boolean => p.featured) ?? null,
  );

  /**
   * Property otherProjects
   * @readonly
   *
   * @description
   * Projects not included in the featured group, preserving snapshot order.
   *
   * @type {Signal<readonly ProjectArticle[]>}
   */
  public readonly otherProjects: Signal<ProjectArticle[]> = computed<ProjectArticle[]>(
    (): ProjectArticle[] =>
      this.content.projects.filter((p: ProjectArticle): boolean => !p.featured),
  );

  /**
   * Property timeline
   * @readonly
   *
   * @description
   * Computed view of the active locale's education and experience entries.
   *
   * @type {Signal<readonly TimelineStep[]>}
   */
  public readonly timeline: Signal<SiteContent['timeline']> = computed<SiteContent['timeline']>(
    () => this.content.timeline,
  );

  /**
   * Property skills
   * @readonly
   *
   * @description
   * Computed view of the active locale's skill columns.
   *
   * @type {Signal<readonly SkillColumn[]>}
   */
  public readonly skills: Signal<SiteContent['skills']> = computed<SiteContent['skills']>(
    () => this.content.skills,
  );

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Locale represented by the loaded snapshot.
   *
   * @type {Signal<SiteLocale>}
   */
  public readonly locale: Signal<SiteContent['locale']> = computed<SiteContent['locale']>(
    () => this.content.locale,
  );
  // #endregion

  // #region Methods
  /**
   * Method project
   * @method project
   *
   * @description
   * Finds one public project article by its stable route slug.
   *
   * @param {string} slug - Project slug from the public route.
   *
   * @returns {ProjectArticle | null} Matching article, or `null` when the slug is absent.
   */
  public project(slug: string): ProjectArticle | null {
    return this.content.projects.find((p: ProjectArticle): boolean => p.slug === slug) ?? null;
  }

  /**
   * Method neighbours
   * @method neighbours
   *
   * @description
   * Resolves adjacent case studies in article order, wrapping at either end; returns `null` for an unknown slug or fewer than two articles.
   *
   * @param {string} slug - Current article slug.
   *
   * @returns {ProjectNeighbours | null} Adjacent articles when navigation is possible.
   */
  public neighbours(slug: string): ProjectNeighbours | null {
    const list: readonly ProjectArticle[] = this.articles;
    const index: number = list.findIndex((p: ProjectArticle): boolean => p.slug === slug);
    if (index < 0 || list.length < 2) {
      return null;
    }
    const previous: ProjectArticle | undefined = list[(index - 1 + list.length) % list.length];
    const next: ProjectArticle | undefined = list[(index + 1) % list.length];
    return previous && next ? { previous, next } : null;
  }

  /**
   * Method slugs
   * @method slugs
   *
   * @description
   * Returns the route slugs of all project articles in snapshot order.
   *
   * @returns {string[]} Project slugs for route parameter generation.
   */
  public slugs(): string[] {
    return this.content.projects.map((p: ProjectArticle): string => p.slug);
  }
  // #endregion
}
