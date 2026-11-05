import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  LOCALE_ID,
  computed,
  effect,
  inject,
  signal,
  untracked,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, type ParamMap } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideGauge,
  lucideListChecks,
  lucideRefreshCw,
  lucideSearch,
  lucideUsers,
} from '@ng-icons/lucide';
import {
  AdminSeoDashboardStore,
  SEO_RANGES,
  type AdminSeoDashboardStoreType,
  type AnalyticsData,
  type SearchConsoleData,
  type SeoDashboard,
  type SeoRange,
  type SeoRefreshOutcome,
  type WebVitalsData,
} from '@vfortin/content-web-data-access/admin';
import {
  ALERT_IMPORTS,
  ButtonDirective,
  PAGE_HEADER_IMPORTS,
  SidebarTriggerComponent,
  SkeletonDirective,
  SpinnerComponent,
  TabsContentDirective,
  TabsDirective,
  TabsListDirective,
  TabsTriggerDirective,
  ToastService,
  ToggleGroupDirective,
  ToggleGroupItemDirective,
  TooltipDirective,
  type ToggleGroupValue,
} from '@vfortin/ui';
import { SEO_RANGE_LABELS } from '@internal/content-web-feature-admin/lib/constants/seo-dashboard-labels.constants';
import type { SeoFormatter } from '@internal/content-web-feature-admin/lib/models/seo-formatter/seo-formatter.interface';
import type { SeoTab } from '@internal/content-web-feature-admin/lib/models/seo-tab/seo-tab.type';
import type { SeoSectionView } from '@internal/content-web-feature-admin/lib/models/seo-section-view/seo-section-view.interface';
import { SeoAnalyticsPanelComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-analytics-panel/seo-analytics-panel.component';
import { SeoAuditPanelComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-audit-panel/seo-audit-panel.component';
import { SeoSearchConsolePanelComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-search-console-panel/seo-search-console-panel.component';
import { SeoSourceStateComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-source-state/seo-source-state.component';
import { SeoWebVitalsPanelComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-web-vitals-panel/seo-web-vitals-panel.component';
import { seoFormatter } from '@internal/content-web-feature-admin/lib/utils/seo-format/seo-format.utils';
import {
  seoRangeFromParam,
  seoRangeParam,
} from '@internal/content-web-feature-admin/lib/utils/seo-range-query/seo-range-query.utils';
import { seoSectionView } from '@internal/content-web-feature-admin/lib/utils/seo-section/seo-section.utils';
import {
  SEO_TABS,
  seoTabFromParam,
  seoTabParam,
} from '@internal/content-web-feature-admin/lib/utils/seo-tab-query/seo-tab-query.utils';

/**
 * Constant CLOCK_MS
 *
 * @description
 * Period of the page clock that turns the « too soon » tooltip back into the default one.
 *
 * @type {number}
 */
const CLOCK_MS: number = 30_000;

/**
 * Component AdminDashboardPageComponent
 * @class AdminDashboardPageComponent
 *
 * @description
 * « Tableau de bord » page (D47), the administration's landing page: the 48 px bar naming the
 * section, the page header with the time of the latest collection, the window toggle (7, 28 or 90
 * days, kept in `?periode=` and scoping every section below) and « Actualiser », then four sections:
 * Search Console, Audience (GA4), Core Web Vitals and the internal SEO audit. Each Google section
 * shows its own state (variables to set, no collection yet, a failed collection above the last good
 * report); another window keeps the previous figures dimmed until it arrives. « Actualiser » starts a
 * background refresh, disabled with a spinner while it runs (the store polls until it ends); within
 * 10 minutes of the previous one its tooltip gives the next allowed time and a refused request is a
 * warning toast.
 */
@Component({
  selector: 'content-admin-dashboard-page',
  imports: [
    ALERT_IMPORTS,
    ButtonDirective,
    NgIcon,
    NgTemplateOutlet,
    PAGE_HEADER_IMPORTS,
    SeoAnalyticsPanelComponent,
    SeoAuditPanelComponent,
    SeoSearchConsolePanelComponent,
    SeoSourceStateComponent,
    SeoWebVitalsPanelComponent,
    SidebarTriggerComponent,
    SkeletonDirective,
    SpinnerComponent,
    TabsContentDirective,
    TabsDirective,
    TabsListDirective,
    TabsTriggerDirective,
    ToggleGroupDirective,
    ToggleGroupItemDirective,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AdminSeoDashboardStore],
  host: { class: 'flex min-h-dvh flex-col' },
  templateUrl: './admin-dashboard-page.component.html',
})
export class AdminDashboardPageComponent {
  // #region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped dashboard state and commands.
   *
   * @type {AdminSeoDashboardStoreType}
   */
  protected readonly store: AdminSeoDashboardStoreType =
    inject<AdminSeoDashboardStoreType>(AdminSeoDashboardStore);

  /**
   * Property rangeLabels
   * @readonly
   *
   * @description
   * Names of the windows on the toggle.
   *
   * @type {Readonly<Record<SeoRange, string>>}
   */
  protected readonly rangeLabels: Readonly<Record<SeoRange, string>> = SEO_RANGE_LABELS;

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the page.
   */
  protected readonly icons: { readonly refresh: string; readonly error: string } = {
    refresh: lucideRefreshCw,
    error: lucideCircleAlert,
  } as const;

  /**
   * Property tab
   * @readonly
   *
   * @description
   * Tab shown, read from `?onglet=` so that a report can be linked and survives a reload.
   */
  protected readonly tab: WritableSignal<SeoTab> = signal<SeoTab>('search-console');

  /**
   * Property skeletonCells
   * @readonly
   *
   * @description
   * Figure cells of the loading placeholder, as many as the widest strip row.
   */
  protected readonly skeletonCells: readonly number[] = [0, 1, 2, 3];

  /**
   * Property format
   * @readonly
   *
   * @description
   * Formatters of the build locale.
   *
   * @type {SeoFormatter}
   */
  private readonly format: SeoFormatter = seoFormatter(inject<string>(LOCALE_ID));

  /**
   * Property now
   * @readonly
   *
   * @description
   * Page clock, ticking every 30 s.
   *
   * @type {WritableSignal<number>}
   */
  private readonly now: WritableSignal<number> = signal<number>(Date.now());

  /**
   * Property dashboard
   * @readonly
   *
   * @description
   * Dashboard shown, the previous one while another window loads.
   *
   * @type {Signal<SeoDashboard | null>}
   */
  protected readonly dashboard: Signal<SeoDashboard | null> = computed<SeoDashboard | null>(
    (): SeoDashboard | null => this.store.dashboard(),
  );

  /**
   * Property stale
   * @readonly
   *
   * @description
   * Whether the figures shown belong to the window being replaced.
   *
   * @type {Signal<boolean>}
   */
  protected readonly stale: Signal<boolean> = computed<boolean>(
    (): boolean => this.store.loading() && this.store.dashboard() !== null,
  );

  /**
   * Property searchConsole
   * @readonly
   *
   * @description
   * Search Console section.
   *
   * @type {Signal<SeoSectionView<SearchConsoleData> | null>}
   */
  protected readonly searchConsole: Signal<SeoSectionView<SearchConsoleData> | null> =
    computed<SeoSectionView<SearchConsoleData> | null>(
      (): SeoSectionView<SearchConsoleData> | null => {
        const dashboard: SeoDashboard | null = this.dashboard();
        return dashboard ? seoSectionView<SearchConsoleData>(dashboard.searchConsole) : null;
      },
    );

  /**
   * Property analytics
   * @readonly
   *
   * @description
   * GA4 section.
   *
   * @type {Signal<SeoSectionView<AnalyticsData> | null>}
   */
  protected readonly analytics: Signal<SeoSectionView<AnalyticsData> | null> =
    computed<SeoSectionView<AnalyticsData> | null>((): SeoSectionView<AnalyticsData> | null => {
      const dashboard: SeoDashboard | null = this.dashboard();
      return dashboard ? seoSectionView<AnalyticsData>(dashboard.analytics) : null;
    });

  /**
   * Property webVitals
   * @readonly
   *
   * @description
   * Core Web Vitals section.
   *
   * @type {Signal<SeoSectionView<WebVitalsData> | null>}
   */
  protected readonly webVitals: Signal<SeoSectionView<WebVitalsData> | null> =
    computed<SeoSectionView<WebVitalsData> | null>((): SeoSectionView<WebVitalsData> | null => {
      const dashboard: SeoDashboard | null = this.dashboard();
      return dashboard ? seoSectionView<WebVitalsData>(dashboard.webVitals) : null;
    });

  /**
   * Property lastFetched
   * @readonly
   *
   * @description
   * Time of the most recent report shown, `null` before any collection.
   *
   * @type {Signal<string | null>}
   */
  /**
   * Property tabs
   * @readonly
   *
   * @description
   * Triggers of the tab set: name, icon and whether the source's last collection failed, which a
   * warning dot and a visually hidden phrase say on the trigger.
   */
  protected readonly tabs: Signal<
    readonly {
      readonly id: SeoTab;
      readonly label: string;
      readonly icon: string;
      readonly failed: boolean;
    }[]
  > = computed((): { id: SeoTab; label: string; icon: string; failed: boolean }[] => {
    const labels: Readonly<Record<SeoTab, string>> = {
      'search-console': 'Search Console',
      audience: $localize`:@@admin.dashboard.analytics.title:Audience`,
      vitals: 'Core Web Vitals',
      audit: $localize`:@@admin.dashboard.audit.title:Audit SEO`,
    };
    const icons: Readonly<Record<SeoTab, string>> = {
      'search-console': lucideSearch,
      audience: lucideUsers,
      vitals: lucideGauge,
      audit: lucideListChecks,
    };
    const failed: Readonly<Record<SeoTab, boolean>> = {
      'search-console': this.searchConsole()?.status === 'error',
      audience: this.analytics()?.status === 'error',
      vitals: this.webVitals()?.status === 'error',
      audit: false,
    };
    return SEO_TABS.map(
      (id: SeoTab): { id: SeoTab; label: string; icon: string; failed: boolean } => ({
        id,
        label: labels[id],
        icon: icons[id],
        failed: failed[id],
      }),
    );
  });

  protected readonly lastFetched: Signal<string | null> = computed<string | null>(
    (): string | null => {
      const times: number[] = [this.searchConsole(), this.analytics(), this.webVitals()]
        .map((view: SeoSectionView<unknown> | null): string | null => view?.fetchedAt ?? null)
        .filter((time: string | null): time is string => time !== null)
        .map((time: string): number => Date.parse(time));
      return times.length ? this.format.dateTime(new Date(Math.max(...times)).toISOString()) : null;
    },
  );

  /**
   * Property tooSoonUntil
   * @readonly
   *
   * @description
   * Formatted time a refresh is accepted again, `null` when it already is.
   *
   * @type {Signal<string | null>}
   */
  protected readonly tooSoonUntil: Signal<string | null> = computed<string | null>(
    (): string | null => {
      const next: string | null = this.store.nextAllowedAt();
      return next && Date.parse(next) > this.now() ? this.format.time(next) : null;
    },
  );

  /**
   * Property refreshTooltip
   * @readonly
   *
   * @description
   * Tooltip of « Actualiser ».
   *
   * @type {Signal<string>}
   */
  protected readonly refreshTooltip: Signal<string> = computed<string>((): string => {
    if (this.store.refreshing())
      return $localize`:@@admin.dashboard.refresh.runningTooltip:Collecte en cours auprès de Google…`;
    const until: string | null = this.tooSoonUntil();
    return until
      ? $localize`:@@admin.dashboard.refresh.tooSoonTooltip:Prochaine actualisation possible à ${until}:time:`
      : $localize`:@@admin.dashboard.refresh.tooltip:Collecter Search Console, Analytics et PageSpeed maintenant`;
  });

  /**
   * Property route
   * @readonly
   *
   * @description
   * Route of the page, whose `?periode=` selects the window.
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Router writing the window to the URL.
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property toasts
   * @readonly
   *
   * @description
   * Toaster of the admin layout, announcing refresh outcomes.
   *
   * @type {ToastService}
   */
  private readonly toasts: ToastService = inject<ToastService>(ToastService);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Follows `?periode=` (links, back and forward) to load its window, ticks the page clock, and
   * toasts the end of a refresh this page started or followed.
   */
  public constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params: ParamMap): void => {
      this.tab.set(seoTabFromParam(params.get('onglet')));
      const range: SeoRange = seoRangeFromParam(params.get('periode'));
      if (range !== this.store.range() || this.store.loadCallState().status === 'idle')
        void this.store.load(range);
    });
    const clock: ReturnType<typeof setInterval> = setInterval(
      (): void => this.now.set(Date.now()),
      CLOCK_MS,
    );
    inject<DestroyRef>(DestroyRef).onDestroy((): void => clearInterval(clock));
    let wasRunning: boolean = false;
    effect((): void => {
      const running: boolean = this.store.dashboard()?.refresh.running ?? false;
      if (wasRunning && !running && this.store.pollCallState().status === 'success') {
        untracked((): void => {
          this.toasts.success(
            $localize`:@@admin.dashboard.refresh.done:Tableau de bord actualisé.`,
          );
        });
      }
      wasRunning = running;
    });
  }
  // #endregion

  // #region Methods
  /**
   * Method selectRange
   * @method selectRange
   *
   * @description
   * Writes a window chosen on the toggle to `?periode=`, which loads it.
   *
   * @param {ToggleGroupValue<SeoRange>} value - Chosen window.
   */
  protected selectRange(value: ToggleGroupValue<SeoRange>): void {
    const range: SeoRange | undefined = SEO_RANGES.find(
      (candidate: SeoRange): boolean => candidate === value,
    );
    if (!range || range === this.store.range()) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { periode: seoRangeParam(range) },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Method selectTab
   * @method selectTab
   *
   * @description
   * Shows a tab and keeps it in `?onglet=`, replacing the history entry so that Back leaves the
   * dashboard instead of walking the tabs; the window parameter is kept.
   *
   * @param {string | null} value - Value of the selected trigger.
   * @returns {void}
   */
  protected selectTab(value: string | null): void {
    const tab: SeoTab = seoTabFromParam(value);
    if (tab === this.tab()) return;
    this.tab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { onglet: seoTabParam(tab) },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * Method refresh
   * @method refresh
   *
   * @description
   * Starts a refresh and toasts a refusal or a failure; the start itself shows on the button.
   */
  protected async refresh(): Promise<void> {
    const outcome: SeoRefreshOutcome | null = await this.store.refresh();
    if (outcome === null || outcome.status === 'started') return;
    if (outcome.status === 'too-soon') {
      this.toasts.warning(
        $localize`:@@admin.dashboard.refresh.tooSoon:Actualisation trop rapprochée de la précédente.`,
        {
          description: outcome.retryAt
            ? $localize`:@@admin.dashboard.refresh.tooSoonDescription:Prochaine actualisation possible à ${this.format.time(outcome.retryAt)}:time:.`
            : $localize`:@@admin.dashboard.refresh.tooSoonLater:Réessayez dans quelques minutes.`,
        },
      );
      return;
    }
    this.toasts.error(
      $localize`:@@admin.dashboard.refresh.failed:L’actualisation n’a pas pu démarrer.`,
      { description: outcome.error.message },
    );
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Retries the read of the current window after a failure.
   */
  protected reload(): void {
    void this.store.load(this.store.range());
  }
  // #endregion
}
