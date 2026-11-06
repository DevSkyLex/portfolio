import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  LOCALE_ID,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, type ParamMap } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideGauge,
  lucideListChecks,
  lucidePanelRight,
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
  ResizableHandleComponent,
  ResizableLayoutService,
  ResizablePanelDirective,
  ResizablePanelGroupDirective,
  SheetHeaderDirective,
  SheetService,
  SheetTitleDirective,
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
  type DialogRef,
  type PanelSize,
  type ToggleGroupValue,
} from '@vfortin/ui';
import {
  DASHBOARD_LAYOUT,
  DASHBOARD_NARROW_QUERY,
} from '@internal/content-web-feature-admin/lib/constants/dashboard-layout.constants';
import { SEO_RANGE_LABELS } from '@internal/content-web-feature-admin/lib/constants/seo-dashboard-labels.constants';
import type { SeoFigure } from '@internal/content-web-feature-admin/lib/models/seo-figure/seo-figure.interface';
import type { SeoFormatter } from '@internal/content-web-feature-admin/lib/models/seo-formatter/seo-formatter.interface';
import type { SeoTab } from '@internal/content-web-feature-admin/lib/models/seo-tab/seo-tab.type';
import type { SeoSectionView } from '@internal/content-web-feature-admin/lib/models/seo-section-view/seo-section-view.interface';
import type { SeoSourceStatus } from '@internal/content-web-feature-admin/lib/models/seo-source-status/seo-source-status.interface';
import { SeoAnalyticsPanelComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-analytics-panel/seo-analytics-panel.component';
import { SeoAuditPanelComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-audit-panel/seo-audit-panel.component';
import { SeoFigureListComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-figure-list/seo-figure-list.component';
import { SeoSearchConsolePanelComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-search-console-panel/seo-search-console-panel.component';
import { SeoSourceListComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-source-list/seo-source-list.component';
import { SeoSourceStateComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-source-state/seo-source-state.component';
import { SeoWebVitalsPanelComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-web-vitals-panel/seo-web-vitals-panel.component';
import {
  analyticsFigures,
  auditFigures,
  searchConsoleFigures,
  seoComparison,
  webVitalsFigures,
} from '@internal/content-web-feature-admin/lib/utils/seo-figures/seo-figures.utils';
import { seoFormatter } from '@internal/content-web-feature-admin/lib/utils/seo-format/seo-format.utils';
import {
  seoRangeFromParam,
  seoRangeParam,
} from '@internal/content-web-feature-admin/lib/utils/seo-range-query/seo-range-query.utils';
import { seoSectionView } from '@internal/content-web-feature-admin/lib/utils/seo-section/seo-section.utils';
import { seoSourceStatuses } from '@internal/content-web-feature-admin/lib/utils/seo-source-statuses/seo-source-statuses.utils';
import {
  SEO_TABS,
  seoTabFromParam,
  seoTabParam,
} from '@internal/content-web-feature-admin/lib/utils/seo-tab-query/seo-tab-query.utils';

/**
 * Interface TabFigures
 *
 * @description
 * Key figures of the tab shown, with the period they are compared with (none for the Web Vitals and
 * the audit, which count the current state).
 */
interface TabFigures {
  readonly items: readonly SeoFigure[];
  readonly comparison: string;
  readonly compared: boolean;
}

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
 * section, the page header with the time of the latest collection and one tab per source (Search
 * Console, Audience (GA4), Core Web Vitals, the internal SEO audit; D51), then the reports, at most
 * 1200 px wide, beside a resizable side panel remembered per viewer: the window toggle (7, 28 or 90
 * days, kept in `?periode=`), « Actualiser », the key figures of the tab and the state of every
 * source. Below 1180 px the panel becomes a « Détails » sheet, the window controls return to the page
 * header and each tab shows its figure strip again. Each Google tab shows its own state (variables to
 * set, no collection yet, a failed collection above the last good report); another window keeps the
 * previous figures dimmed until it arrives. « Actualiser » starts a background refresh, disabled with
 * a spinner while it runs (the store polls until it ends); within 10 minutes of the previous one its
 * tooltip gives the next allowed time and a refused request is a warning toast.
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
    ResizableHandleComponent,
    ResizablePanelDirective,
    ResizablePanelGroupDirective,
    SeoAuditPanelComponent,
    SeoFigureListComponent,
    SeoSearchConsolePanelComponent,
    SeoSourceListComponent,
    SeoSourceStateComponent,
    SeoWebVitalsPanelComponent,
    SheetHeaderDirective,
    SheetTitleDirective,
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
  protected readonly icons: {
    readonly refresh: string;
    readonly error: string;
    readonly details: string;
  } = {
    refresh: lucideRefreshCw,
    error: lucideCircleAlert,
    details: lucidePanelRight,
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

  /**
   * Property lastFetched
   * @readonly
   *
   * @description
   * Time of the most recent report shown, `null` before any collection.
   *
   * @type {Signal<string | null>}
   */
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
   * Property figures
   * @readonly
   *
   * @description
   * Key figures of the tab shown, for the side panel; `null` while its source has no report.
   *
   * @type {Signal<TabFigures | null>}
   */
  protected readonly figures: Signal<TabFigures | null> = computed<TabFigures | null>(
    (): TabFigures | null => {
      const dashboard: SeoDashboard | null = this.dashboard();
      if (!dashboard) return null;
      switch (this.tab()) {
        case 'search-console': {
          const data: SearchConsoleData | null = this.searchConsole()?.data ?? null;
          return data
            ? {
                items: searchConsoleFigures(data, this.format),
                comparison: seoComparison(data.window.previous, this.format),
                compared: true,
              }
            : null;
        }
        case 'audience': {
          const data: AnalyticsData | null = this.analytics()?.data ?? null;
          return data
            ? {
                items: analyticsFigures(data, this.format),
                comparison: seoComparison(data.window.previous, this.format),
                compared: true,
              }
            : null;
        }
        case 'vitals': {
          const data: WebVitalsData | null = this.webVitals()?.data ?? null;
          return data
            ? { items: webVitalsFigures(data, this.format), comparison: '', compared: false }
            : null;
        }
        case 'audit':
          return {
            items: auditFigures(dashboard.audit, this.format),
            comparison: '',
            compared: false,
          };
      }
    },
  );

  /**
   * Property sources
   * @readonly
   *
   * @description
   * Collection state of every source, for the side panel; `null` before the first read.
   *
   * @type {Signal<readonly SeoSourceStatus[] | null>}
   */
  protected readonly sources: Signal<readonly SeoSourceStatus[] | null> = computed<
    readonly SeoSourceStatus[] | null
  >((): readonly SeoSourceStatus[] | null => {
    const dashboard: SeoDashboard | null = this.dashboard();
    return dashboard ? seoSourceStatuses(dashboard, this.format) : null;
  });

  /**
   * Property splitLayout
   * @readonly
   *
   * @description
   * Default split, bounds and storage key of the reports and the side panel.
   */
  protected readonly splitLayout: typeof DASHBOARD_LAYOUT = DASHBOARD_LAYOUT;

  /**
   * Property layouts
   * @readonly
   *
   * @description
   * Per-viewer storage of the split between the reports and the side panel.
   *
   * @type {ResizableLayoutService}
   */
  private readonly layouts: ResizableLayoutService =
    inject<ResizableLayoutService>(ResizableLayoutService);

  /**
   * Property panelWidth
   * @readonly
   *
   * @description
   * Side panel width in pixels, read from storage before the first render so the panel starts at
   * its remembered width (320 px by default), and kept in step with each save.
   *
   * @type {WritableSignal<number>}
   */
  protected readonly panelWidth: WritableSignal<number> = signal<number>(
    this.layouts.readPixels(DASHBOARD_LAYOUT),
  );

  /**
   * Property panelDefault
   * @readonly
   *
   * @description
   * Side panel width bound to its panel, as a pixel size; the reports take the rest.
   *
   * @type {Signal<PanelSize>}
   */
  protected readonly panelDefault: Signal<PanelSize> = computed<PanelSize>(
    (): PanelSize => `${this.panelWidth()}px` as const,
  );

  /**
   * Property narrow
   * @readonly
   *
   * @description
   * Whether the side panel moves to the « Détails » sheet and the window controls to the page
   * header; `false` where `matchMedia` is unavailable.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly narrow: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property detailsOpen
   * @readonly
   *
   * @description
   * Whether the « Détails » sheet is open, for the trigger's `aria-expanded`.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly detailsOpen: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property detailsTemplate
   * @readonly
   *
   * @description
   * Content of the « Détails » sheet.
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly detailsTemplate: Signal<TemplateRef<unknown> | undefined> = viewChild<
    TemplateRef<unknown> | undefined
  >('detailsSheet');

  /**
   * Property detailsSheet
   *
   * @description
   * Open « Détails » sheet, `null` while closed.
   *
   * @type {DialogRef<unknown> | null}
   */
  private detailsSheet: DialogRef<unknown> | null = null;

  /**
   * Property sheets
   * @readonly
   *
   * @description
   * Opens the « Détails » sheet below 1180 px.
   *
   * @type {SheetService}
   */
  private readonly sheets: SheetService = inject<SheetService>(SheetService);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Page injector handed to the sheet, whose content reads the page's store.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property document
   * @readonly
   *
   * @description
   * Document whose window answers the narrow layout query.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

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
   * Follows `?periode=` (links, back and forward) to load its window, ticks the page clock, follows
   * the side panel breakpoint, and toasts the end of a refresh this page started or followed.
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
    const destroy: DestroyRef = inject<DestroyRef>(DestroyRef);
    destroy.onDestroy((): void => {
      clearInterval(clock);
      this.detailsSheet?.close();
    });
    this.watchWidth(destroy);
    // Back above 1180 px the side panel shows the details again: an open sheet would repeat them.
    effect((): void => {
      if (!this.narrow()) untracked((): void => this.detailsSheet?.close());
    });
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
   * Method openDetails
   * @method openDetails
   *
   * @description
   * Opens the key figures and the sources in a narrow right sheet whose title takes the focus first,
   * as the project editor's properties sheet does.
   */
  protected openDetails(): void {
    const template: TemplateRef<unknown> | undefined = this.detailsTemplate();
    if (!template || this.detailsSheet) return;
    const sheet: DialogRef<unknown> = this.sheets.open(template, {
      side: 'right',
      class: 'max-w-80 gap-6 p-5',
      autoFocus: 'first-heading',
      injector: this.injector,
    });
    this.detailsSheet = sheet;
    this.detailsOpen.set(true);
    sheet.closed.subscribe((): void => {
      this.detailsSheet = null;
      this.detailsOpen.set(false);
    });
  }

  /**
   * Method saveSplit
   * @method saveSplit
   *
   * @description
   * Remembers the side panel width after a drag, a key press or a reset on the separator; a width
   * not measured yet is not saved.
   *
   * @param {number | undefined} width - Side panel width in pixels.
   */
  protected saveSplit(width: number | undefined): void {
    if (!width) return;
    this.panelWidth.set(Math.round(width));
    this.layouts.writePixels(DASHBOARD_LAYOUT, width);
  }

  /**
   * Method resetSplit
   * @method resetSplit
   *
   * @description
   * Restores the default side panel width (320 px) on a double click of the separator, then saves it.
   *
   * @param {ResizablePanelGroupDirective} group - Group of the reports and the side panel.
   * @param {ResizableHandleComponent} handle - Separator between them.
   */
  protected resetSplit(
    group: ResizablePanelGroupDirective,
    handle: ResizableHandleComponent,
  ): void {
    // The delta applies to the reports, before the handle: the panel grows when they shrink.
    const width: number = DASHBOARD_LAYOUT.pixels.default;
    group.resizePixels(handle, (group.pixelSizes()[1] ?? width) - width);
    group.commit();
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

  /**
   * Method watchWidth
   * @method watchWidth
   *
   * @description
   * Follows the side panel breakpoint until the page is destroyed. The admin renders in the browser
   * only (D18); the optional calls cover environments without `matchMedia`.
   *
   * @param {DestroyRef} destroyRef - Lifetime of the page, which removes the listener.
   */
  private watchWidth(destroyRef: DestroyRef): void {
    const query: MediaQueryList | undefined =
      this.document.defaultView?.matchMedia?.(DASHBOARD_NARROW_QUERY);
    if (!query) return;
    this.narrow.set(query.matches);
    const listener: (event: MediaQueryListEvent) => void = (event: MediaQueryListEvent): void =>
      this.narrow.set(event.matches);
    query.addEventListener('change', listener);
    destroyRef.onDestroy((): void => query.removeEventListener('change', listener));
  }
  // #endregion
}
