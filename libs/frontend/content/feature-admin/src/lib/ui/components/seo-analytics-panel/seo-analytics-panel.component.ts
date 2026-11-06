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
  BarListComponent,
  DataTableComponent,
  HeatmapComponent,
  LineChartComponent,
  type BarListItem,
  type ChartPoint,
  type ChartSeries,
  type DataTableColumn,
} from '@vfortin/ui';
import type { SeoDelta } from '@internal/content-web-feature-admin/lib/models/seo-delta/seo-delta.interface';
import type { SeoFormatter } from '@internal/content-web-feature-admin/lib/models/seo-formatter/seo-formatter.interface';
import { SeoKpiTileComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-kpi-tile/seo-kpi-tile.component';
import { SeoSectionHeaderComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-section-header/seo-section-header.component';
import {
  type SeoCalendar,
  seoCalendar,
} from '@internal/content-web-feature-admin/lib/utils/seo-calendar/seo-calendar.utils';
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
 * Component SeoAnalyticsPanelComponent
 * @class SeoAnalyticsPanelComponent
 *
 * @description
 * Google Analytics 4 tab of the « Tableau de bord » (D47, D48, D51), full width: a strip of five
 * figure cells (active users, sessions, views, engagement rate, average engagement time) with their
 * change against the period before; a grid of chart cells: the three daily counts on one line chart
 * (one unit, one scale), sessions laid out by weekday and week as a heatmap, sessions per channel and
 * per country as ranked bars with their share; then the top pages as a full-width sortable table.
 * `stale` dims it while another window loads.
 */
@Component({
  selector: 'content-seo-analytics-panel',
  imports: [
    BarListComponent,
    DataTableComponent,
    HeatmapComponent,
    LineChartComponent,
    SeoKpiTileComponent,
    SeoSectionHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col' },
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
   * Property locale
   * @readonly
   *
   * @description
   * Locale of the build, for the weekday names of the calendar.
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /**
   * Property format
   * @readonly
   *
   * @description
   * Formatters of the build locale.
   *
   * @type {SeoFormatter}
   */
  protected readonly format: SeoFormatter = seoFormatter(this.locale);

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
   * Property daily
   * @readonly
   *
   * @description
   * Active users, sessions and views of each day: three counts of one unit, so one chart and one
   * scale, in the series tones' fixed order.
   *
   * @type {Signal<readonly ChartSeries[]>}
   */
  protected readonly daily: Signal<readonly ChartSeries[]> = computed<readonly ChartSeries[]>(
    (): readonly ChartSeries[] => {
      const days: readonly AudienceDay[] = this.data().daily;
      const points = (pick: (day: AudienceDay) => number): readonly ChartPoint[] =>
        days.map((day: AudienceDay): ChartPoint => ({
          label: this.format.day(day.date),
          value: pick(day),
          display: this.format.count(pick(day)),
        }));
      return [
        {
          key: 'users',
          label: $localize`:@@admin.dashboard.analytics.activeUsers:Utilisateurs actifs`,
          tone: 'chart-1',
          points: points((day: AudienceDay): number => day.activeUsers),
        },
        {
          key: 'sessions',
          label: $localize`:@@admin.dashboard.analytics.sessions:Sessions`,
          tone: 'chart-2',
          points: points((day: AudienceDay): number => day.sessions),
        },
        {
          key: 'views',
          label: $localize`:@@admin.dashboard.analytics.views:Vues`,
          tone: 'chart-3',
          points: points((day: AudienceDay): number => day.views),
        },
      ];
    },
  );

  /**
   * Property calendar
   * @readonly
   *
   * @description
   * Sessions of each day by weekday and week.
   *
   * @type {Signal<SeoCalendar>}
   */
  protected readonly calendar: Signal<SeoCalendar> = computed<SeoCalendar>((): SeoCalendar =>
    seoCalendar(
      this.data().daily,
      (day: AudienceDay): number => day.sessions,
      (value: number): string =>
        value === 1
          ? $localize`:@@admin.dashboard.analytics.sessionCount.one:${this.format.count(value)}:count: session`
          : $localize`:@@admin.dashboard.analytics.sessionCount.other:${this.format.count(value)}:count: sessions`,
      this.locale,
    ),
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
      width: 360,
      minWidth: 160,
      maxWidth: 1200,
      class: 'truncate',
    },
    {
      id: 'views',
      width: 112,
      header: $localize`:@@admin.dashboard.analytics.views:Vues`,
      cell: (page: AudiencePage): string => this.format.count(page.views),
      sortValue: (page: AudiencePage): number => page.views,
      sortable: true,
      align: 'end',
      class: 'tabular-nums',
    },
    {
      id: 'users',
      width: 168,
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
