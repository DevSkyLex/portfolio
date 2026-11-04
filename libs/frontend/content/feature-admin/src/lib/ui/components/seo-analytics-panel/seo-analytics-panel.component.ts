import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  booleanAttribute,
  computed,
  inject,
  input,
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
} from '@angular/core';
import type { AnalyticsData } from '@vfortin/content-web-data-access/admin';
import {
  AreaChartComponent,
  BarListComponent,
  CARD_IMPORTS,
  DataTableComponent,
  type BarListItem,
  type ChartPoint,
  type DataTableColumn,
} from '@vfortin/ui';
import type { SeoDelta } from '@internal/content-web-feature-admin/lib/models/seo-delta/seo-delta.interface';
import type { SeoFormatter } from '@internal/content-web-feature-admin/lib/models/seo-formatter/seo-formatter.interface';
import { SeoKpiTileComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-kpi-tile/seo-kpi-tile.component';
import { relativeDelta } from '@internal/content-web-feature-admin/lib/utils/seo-delta/seo-delta.utils';
import { seoFormatter } from '@internal/content-web-feature-admin/lib/utils/seo-format/seo-format.utils';

/**
 * Type AudienceDay
 *
 * @description
 * One day of the GA4 series.
 */
type AudienceDay = AnalyticsData['daily'][number];

/**
 * Type AudiencePage
 *
 * @description
 * One page of the GA4 top pages.
 */
type AudiencePage = AnalyticsData['pages'][number];

/**
 * Type AudienceShare
 *
 * @description
 * One channel or country.
 */
type AudienceShare = AnalyticsData['channels'][number];

/**
 * Interface Kpi
 *
 * @description
 * One stat tile of the section.
 */
interface Kpi {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly delta: SeoDelta | null;
}

/**
 * Interface DailyChart
 *
 * @description
 * One of the small multiples of the daily series.
 */
interface DailyChart {
  readonly id: string;
  readonly label: string;
  readonly valueHeader: string;
  readonly points: readonly ChartPoint[];
}

/**
 * Component SeoAnalyticsPanelComponent
 * @class SeoAnalyticsPanelComponent
 *
 * @description
 * Google Analytics 4 report of the « Tableau de bord » (D47, D48): five stat tiles (active users,
 * sessions, views, engagement rate, average engagement time) with their change against the period
 * before; the three daily series as small multiples, one chart per measure; the top pages in a
 * sortable table; sessions per channel and per country as ranked bars with their share. `stale`
 * dims it while another window loads.
 */
@Component({
  selector: 'content-seo-analytics-panel',
  imports: [
    AreaChartComponent,
    BarListComponent,
    CARD_IMPORTS,
    DataTableComponent,
    SeoKpiTileComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-3' },
  templateUrl: './seo-analytics-panel.component.html',
})
export class SeoAnalyticsPanelComponent {
  // #region Properties
  /**
   * Property data
   * @readonly
   *
   * @description
   * Report of the window.
   *
   * @type {InputSignal<AnalyticsData>}
   */
  public readonly data: InputSignal<AnalyticsData> = input.required<AnalyticsData>();

  /**
   * Property stale
   * @readonly
   *
   * @description
   * Whether another window is loading.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly stale: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property format
   * @readonly
   *
   * @description
   * Formatters of the build locale.
   *
   * @type {SeoFormatter}
   */
  protected readonly format: SeoFormatter = seoFormatter(inject<string>(LOCALE_ID));

  /**
   * Property comparison
   * @readonly
   *
   * @description
   * Name of the period compared.
   *
   * @type {Signal<string>}
   */
  protected readonly comparison: Signal<string> = computed<string>((): string => {
    const previous: { start: string; end: string } = this.data().window.previous;
    const span: string = this.format.span(previous.start, previous.end);
    return $localize`:@@admin.dashboard.kpi.comparison:vs ${span}:span:`;
  });

  /**
   * Property kpis
   * @readonly
   *
   * @description
   * Stat tiles of the window.
   *
   * @type {Signal<readonly Kpi[]>}
   */
  protected readonly kpis: Signal<readonly Kpi[]> = computed<readonly Kpi[]>((): readonly Kpi[] => {
    const { totals, previous } = this.data();
    const format: SeoFormatter = this.format;
    return [
      {
        id: 'users',
        label: $localize`:@@admin.dashboard.analytics.activeUsers:Utilisateurs actifs`,
        value: format.count(totals.activeUsers),
        delta: relativeDelta(totals.activeUsers, previous.activeUsers, format),
      },
      {
        id: 'sessions',
        label: $localize`:@@admin.dashboard.analytics.sessions:Sessions`,
        value: format.count(totals.sessions),
        delta: relativeDelta(totals.sessions, previous.sessions, format),
      },
      {
        id: 'views',
        label: $localize`:@@admin.dashboard.analytics.views:Vues`,
        value: format.count(totals.views),
        delta: relativeDelta(totals.views, previous.views, format),
      },
      {
        id: 'engagement',
        label: $localize`:@@admin.dashboard.analytics.engagementRate:Taux d’engagement`,
        value: format.percent(totals.engagementRate),
        delta: relativeDelta(totals.engagementRate, previous.engagementRate, format),
      },
      {
        id: 'duration',
        label: $localize`:@@admin.dashboard.analytics.averageEngagement:Durée d’engagement moyenne`,
        value: format.duration(totals.averageEngagementSeconds),
        delta: relativeDelta(
          totals.averageEngagementSeconds,
          previous.averageEngagementSeconds,
          format,
        ),
      },
    ];
  });

  /**
   * Property charts
   * @readonly
   *
   * @description
   * Daily series, one chart per measure.
   *
   * @type {Signal<readonly DailyChart[]>}
   */
  protected readonly charts: Signal<readonly DailyChart[]> = computed<readonly DailyChart[]>(
    (): readonly DailyChart[] => {
      const daily: readonly AudienceDay[] = this.data().daily;
      const series = (pick: (day: AudienceDay) => number): readonly ChartPoint[] =>
        daily.map((day: AudienceDay): ChartPoint => ({
          label: this.format.day(day.date),
          value: pick(day),
          display: this.format.count(pick(day)),
        }));
      return [
        {
          id: 'users',
          label: $localize`:@@admin.dashboard.analytics.usersPerDay:Utilisateurs actifs par jour`,
          valueHeader: $localize`:@@admin.dashboard.analytics.activeUsers:Utilisateurs actifs`,
          points: series((day: AudienceDay): number => day.activeUsers),
        },
        {
          id: 'sessions',
          label: $localize`:@@admin.dashboard.analytics.sessionsPerDay:Sessions par jour`,
          valueHeader: $localize`:@@admin.dashboard.analytics.sessions:Sessions`,
          points: series((day: AudienceDay): number => day.sessions),
        },
        {
          id: 'views',
          label: $localize`:@@admin.dashboard.analytics.viewsPerDay:Vues par jour`,
          valueHeader: $localize`:@@admin.dashboard.analytics.views:Vues`,
          points: series((day: AudienceDay): number => day.views),
        },
      ];
    },
  );

  /**
   * Property channels
   * @readonly
   *
   * @description
   * Sessions per default channel group, most first.
   *
   * @type {Signal<readonly BarListItem[]>}
   */
  protected readonly channels: Signal<readonly BarListItem[]> = computed<readonly BarListItem[]>(
    (): readonly BarListItem[] => this.shares(this.data().channels),
  );

  /**
   * Property countries
   * @readonly
   *
   * @description
   * Sessions of the top countries, most first.
   *
   * @type {Signal<readonly BarListItem[]>}
   */
  protected readonly countries: Signal<readonly BarListItem[]> = computed<readonly BarListItem[]>(
    (): readonly BarListItem[] => this.shares(this.data().countries),
  );

  /**
   * Property pageColumns
   * @readonly
   *
   * @description
   * Columns of the top pages.
   *
   * @type {readonly DataTableColumn<AudiencePage>[]}
   */
  protected readonly pageColumns: readonly DataTableColumn<AudiencePage>[] = [
    {
      id: 'path',
      header: $localize`:@@admin.dashboard.searchConsole.page:Page`,
      cell: (page: AudiencePage): string => page.path,
      sortable: true,
      class: 'max-w-0 w-full truncate',
    },
    {
      id: 'views',
      header: $localize`:@@admin.dashboard.analytics.views:Vues`,
      cell: (page: AudiencePage): string => this.format.count(page.views),
      sortValue: (page: AudiencePage): number => page.views,
      sortable: true,
      align: 'end',
      class: 'tabular-nums',
    },
    {
      id: 'users',
      header: $localize`:@@admin.dashboard.analytics.activeUsers:Utilisateurs actifs`,
      cell: (page: AudiencePage): string => this.format.count(page.activeUsers),
      sortValue: (page: AudiencePage): number => page.activeUsers,
      sortable: true,
      align: 'end',
      class: 'tabular-nums',
    },
  ];

  /**
   * Property pageKey
   * @readonly
   *
   * @description
   * Identity of a page row, its path.
   *
   * @type {(page: AudiencePage) => string}
   */
  protected readonly pageKey: (page: AudiencePage) => string = (page: AudiencePage): string =>
    page.path;
  // #endregion

  // #region Methods
  /**
   * Method shares
   * @method shares
   *
   * @description
   * Ranked bars of sessions with each row's share of the window's sessions (the countries are a top
   * 10, so their shares need not add up to 100 %).
   *
   * @param {readonly AudienceShare[]} rows - Channels or countries.
   *
   * @returns {readonly BarListItem[]} Bars, most sessions first.
   */
  private shares(rows: readonly AudienceShare[]): readonly BarListItem[] {
    const sorted: AudienceShare[] = [...rows].sort(
      (a: AudienceShare, b: AudienceShare): number => b.sessions - a.sessions,
    );
    const total: number = this.data().totals.sessions;
    return sorted.map((row: AudienceShare): BarListItem => ({
      key: row.key,
      label: row.key,
      value: row.sessions,
      display:
        total > 0
          ? `${this.format.count(row.sessions)} · ${this.format.percent(row.sessions / total)}`
          : this.format.count(row.sessions),
    }));
  }
  // #endregion
}
