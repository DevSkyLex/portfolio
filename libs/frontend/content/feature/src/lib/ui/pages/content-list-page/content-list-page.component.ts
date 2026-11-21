import {
  type Signal,
  type WritableSignal,
  DestroyRef,
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  effect,
  inject,
  linkedSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, type ParamMap } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { lucideSearch } from '@ng-icons/lucide';
import { PageSeoService, SiteContentService } from '@vfortin/content-web-data-access';
import { ProjectCardComponent, publicationTags, techKey } from '@vfortin/content-web-ui';
import {
  DATA_TABLE_LABELS,
  DataTableFilterBarComponent,
  EmptyDescriptionDirective,
  EmptyDirective,
  EmptyHeaderDirective,
  EmptyMediaDirective,
  EmptyTitleDirective,
  buildFacetViews,
  hasActiveFilters,
  matchesFacets,
  matchesSearch,
  type DataTableFacet,
  type DataTableFacetOption,
  type DataTableFacetView,
  type DataTableLabels,
  type DataTableState,
} from '@vfortin/ui';
import { ContentPageHeroComponent } from '@internal/content-web-feature/lib/ui/components/content-page-hero/content-page-hero.component';

type ArticleFilters = Pick<DataTableState, 'search' | 'facets'>;
type Publication = ReturnType<SiteContentService['publications']>[number];

/** Public article catalogue with URL-backed search and facets. */
@Component({
  selector: 'content-list-page',
  imports: [
    ContentPageHeroComponent,
    DataTableFilterBarComponent,
    EmptyDescriptionDirective,
    EmptyDirective,
    EmptyHeaderDirective,
    EmptyMediaDirective,
    EmptyTitleDirective,
    NgIcon,
    ProjectCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="@container/page">
      <content-page-hero [title]="heading" backLink="/" [backLabel]="homeLabel" />
      <section class="@container relative wrap pb-24">
        <div class="relative z-1 mb-10 flex flex-col gap-3">
          <ui-data-table-filter-bar
            [state]="filters()"
            [facetViews]="facetViews()"
            [labels]="filterLabels"
            controls="article-results"
            size="lg"
            (searchChanged)="changeSearch($event)"
            (facetChanged)="changeFacet($event.id, $event.values)"
            (resetRequested)="changeFilters({ search: '', facets: {} })"
          />
          <p
            class="text-[15px]/[22px] text-fg-muted"
            [class.sr-only]="items().length === 0"
            role="status"
          >
            {{ resultCount() }}
          </p>
        </div>
        <div
          class="grid grid-cols-3 gap-x-8 gap-y-16 @max-[960px]/page:grid-cols-2 @max-[768px]/page:grid-cols-1 @max-[768px]/page:gap-12"
          id="article-results"
        >
          @for (item of items(); track item.slug) {
            <content-project-card [project]="item" [link]="['/articles', item.slug]" />
          } @empty {
            <div uiEmpty class="col-span-full">
              <div uiEmptyHeader>
                @if (filtersActive()) {
                  <div uiEmptyMedia variant="icon">
                    <ng-icon [svg]="searchIcon" size="16" />
                  </div>
                  <h2 uiEmptyTitle>{{ filterLabels.noResults }}</h2>
                  <p uiEmptyDescription>{{ filterLabels.noResultsHint }}</p>
                } @else {
                  <h2 uiEmptyTitle i18n="@@collection.empty">Aucun contenu à afficher.</h2>
                }
              </div>
            </div>
          }
        </div>
      </section>
    </div>
  `,
})
export class ContentListPageComponent {
  private readonly content: SiteContentService = inject<SiteContentService>(SiteContentService);
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
  private readonly router: Router = inject<Router>(Router);
  private readonly params: Signal<ParamMap> = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private readonly collator: Intl.Collator = new Intl.Collator(inject<string>(LOCALE_ID));

  protected readonly homeLabel: string = $localize`:@@collection.home:Accueil`;
  protected readonly searchIcon: typeof lucideSearch = lucideSearch;
  protected readonly filterLabels: DataTableLabels = {
    ...DATA_TABLE_LABELS,
    searchLabel: $localize`:@@articles.searchLabel:Rechercher des articles`,
  };
  protected readonly heading: string = $localize`:@@section.articles:Articles`;
  private readonly publications: Signal<readonly Publication[]> = computed(() =>
    this.content.publications().map((article) => ({
      ...article,
      taxonomy: {
        ...article.taxonomy,
        tags: publicationTags(article.taxonomy.tags, article.techs),
      },
    })),
  );

  private readonly facets: Signal<readonly DataTableFacet<Publication>[]> = computed(() => {
    const articles: readonly Publication[] = this.publications();
    return [
      {
        id: 'category',
        label: $localize`:@@articles.category:Catégorie`,
        value: (article): string => article.taxonomy.category.key,
        options: this.options([
          this.content.projectCategory,
          ...articles.map((article) => article.taxonomy.category),
        ]),
      },
      {
        id: 'tag',
        label: $localize`:@@articles.tag:Tag`,
        value: (article): string[] => article.taxonomy.tags.map((tag): string => tag.key),
        options: this.options(articles.flatMap((article) => article.taxonomy.tags)),
      },
    ];
  });
  protected readonly filters: WritableSignal<ArticleFilters> = linkedSignal(() => {
    const params: ParamMap = this.params();
    const facets: Record<string, readonly string[]> = {};
    for (const facet of this.facets()) {
      const keys: Set<string> = new Set(facet.options?.map((option) => option.value));
      const requested: string[] = params.getAll(facet.id);
      const values: string[] = [
        ...new Set(facet.id === 'tag' ? requested.map(techKey) : requested),
      ].filter((key) => keys.has(key));
      if (values.length) facets[facet.id] = values;
    }
    return { search: params.get('q') ?? '', facets };
  });
  protected readonly filtersActive: Signal<boolean> = computed(() =>
    hasActiveFilters(this.filters()),
  );
  private readonly searched: Signal<readonly Publication[]> = computed(() => {
    const query: string = this.filters().search;
    return this.publications().filter((article) =>
      matchesSearch(
        [
          article.title,
          article.summary,
          article.lead,
          article.taxonomy.category.label,
          ...article.taxonomy.tags.flatMap((tag) => [tag.label, tag.key]),
        ],
        query,
      ),
    );
  });
  protected readonly facetViews: Signal<readonly DataTableFacetView[]> = computed(() =>
    buildFacetViews(
      this.facets(),
      this.publications(),
      this.searched(),
      this.filters().facets,
      this.collator,
    ),
  );
  protected readonly items: Signal<readonly Publication[]> = computed(() =>
    this.searched().filter((article) =>
      matchesFacets(article, this.facets(), this.filters().facets),
    ),
  );
  protected readonly resultCount: Signal<string> = computed(() => {
    const count: number = this.items().length;
    if (count === 0) return this.filterLabels.noResults;
    return count === 1
      ? $localize`:@@articles.resultOne:1 article`
      : $localize`:@@articles.resultCount:${count}:COUNT: articles`;
  });

  public constructor() {
    const seo: PageSeoService = inject<PageSeoService>(PageSeoService);
    inject<DestroyRef>(DestroyRef).onDestroy(() => seo.clear());
    effect(() =>
      seo.website({ title: this.heading, description: this.heading, path: '/articles' }),
    );
  }

  protected changeSearch(search: string): void {
    this.changeFilters({ ...this.filters(), search });
  }

  protected changeFacet(id: string, values: readonly string[]): void {
    this.changeFilters({ ...this.filters(), facets: { ...this.filters().facets, [id]: values } });
  }

  /** Renders input immediately and writes the complete filter selection in the current history entry. */
  protected changeFilters(state: ArticleFilters): void {
    this.filters.set(state);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParamsHandling: 'merge',
      queryParams: {
        q: state.search || null,
        category: state.facets['category']?.length ? state.facets['category'] : null,
        tag: state.facets['tag']?.length ? state.facets['tag'] : null,
      },
      replaceUrl: true,
      scroll: 'manual',
    });
  }

  private options(terms: readonly { key: string; label: string }[]): DataTableFacetOption[] {
    return [...new Map(terms.map((term) => [term.key, term.label]))]
      .sort((a, b) => this.collator.compare(a[1], b[1]))
      .map(([value, label]) => ({ value, label }));
  }
}
