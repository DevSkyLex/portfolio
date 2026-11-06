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
import type { SearchConsoleData } from '@vfortin/content-web-data-access/admin';
import {
  EMPTY_IMPORTS,
  DataTableEmptyDirective,
  AreaChartComponent,
  ColumnChartComponent,
  DataTableComponent,
  LineChartComponent,
  ScatterChartComponent,
  StackedBarsComponent,
  type ChartLegendEntry,
  type ChartPoint,
  type ChartSeries,
  type DataTableColumn,
  type ScatterPoint,
  type StackedBarRow,
  type StackedBarSegment,
} from '@vfortin/ui';
import { lucideFileText, lucideSearch } from '@ng-icons/lucide';
import { NgIcon } from '@ng-icons/core';
import {
  SEO_DEVICE_LABELS,
  SEO_DEVICE_ORDER,
} from '@internal/content-web-feature-admin/lib/constants/seo-dashboard-labels.constants';
import type { SeoFormatter } from '@internal/content-web-feature-admin/lib/models/seo-formatter/seo-formatter.interface';
import { SeoKpiTileComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-kpi-tile/seo-kpi-tile.component';
import { SeoSectionHeaderComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-section-header/seo-section-header.component';
import type { SeoFigure } from '@internal/content-web-feature-admin/lib/models/seo-figure/seo-figure.interface';
import {
  searchConsoleFigures,
  seoComparison,
} from '@internal/content-web-feature-admin/lib/utils/seo-figures/seo-figures.utils';
import { seoFormatter } from '@internal/content-web-feature-admin/lib/utils/seo-format/seo-format.utils';

/**
 * Type SearchRow
 *
 * @description
 * One query, page or device of the report.
 */
type SearchRow = SearchConsoleData['queries'][number];

/**
 * Function pagePath
 *
 * @description
 * Path of an absolute page URL, as the admin names pages (`/projects/movah`, `/en/`); a value that
 * is not a URL stays as is.
 *
 * @param {string} url - Page URL.
 *
 * @returns {string} Path with its query.
 */
function pagePath(url: string): string {
  try {
    const parsed: URL = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

/**
 * Component SeoSearchConsolePanelComponent
 * @class SeoSearchConsolePanelComponent
 *
 * @description
 * Search Console tab of the « Tableau de bord » (D47, D51), full width: a strip of four figure cells
 * (clicks, impressions, CTR, average position, lower being better) with their change against the
 * period before; a grid of chart cells, one measure each, never two scales on one chart: clicks per
 * day as columns, impressions as an area, CTR as a line, the position as an inverted line, queries
 * placed by position and CTR, clicks split by device in one segmented bar; then the top queries and
 * pages as full-width sortable tables. `stale` dims it while another window loads.
 */
@Component({
  selector: 'content-seo-search-console-panel',
  imports: [
    AreaChartComponent,
    ColumnChartComponent,
    DataTableComponent,
    DataTableEmptyDirective,
    EMPTY_IMPORTS,
    LineChartComponent,
    NgIcon,
    ScatterChartComponent,
    SeoKpiTileComponent,
    SeoSectionHeaderComponent,
    StackedBarsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col' },
  templateUrl: './seo-search-console-panel.component.html',
})
export class SeoSearchConsolePanelComponent {
  // #region Properties
  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the empty tables.
   */
  protected readonly icons: { readonly query: string; readonly page: string } = {
    query: lucideSearch,
    page: lucideFileText,
  } as const;

  /**
   * Property data
   * @readonly
   *
   * @description
   * Report of the window.
   *
   * @type {InputSignal<SearchConsoleData>}
   */
  public readonly data: InputSignal<SearchConsoleData> = input.required<SearchConsoleData>();

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
   * Property strip
   * @readonly
   *
   * @description
   * Whether the strip of key figures shows above the charts: off while the dashboard's side panel
   * lists them (D51).
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly strip: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    true,
    { transform: booleanAttribute },
  );

  /**
   * Property comparison
   * @readonly
   *
   * @description
   * Name of the period compared.
   *
   * @type {Signal<string>}
   */
  protected readonly comparison: Signal<string> = computed<string>((): string =>
    seoComparison(this.data().window.previous, this.format),
  );

  /**
   * Property kpis
   * @readonly
   *
   * @description
   * Key figures of the window.
   *
   * @type {Signal<readonly SeoFigure[]>}
   */
  protected readonly kpis: Signal<readonly SeoFigure[]> = computed<readonly SeoFigure[]>(
    (): readonly SeoFigure[] => searchConsoleFigures(this.data(), this.format),
  );

  /**
   * Property clicks
   * @readonly
   *
   * @description
   * Clicks per day.
   *
   * @type {Signal<readonly ChartPoint[]>}
   */
  protected readonly clicks: Signal<readonly ChartPoint[]> = computed<readonly ChartPoint[]>(
    (): readonly ChartPoint[] =>
      this.data().daily.map((day: SearchConsoleData['daily'][number]): ChartPoint => ({
        label: this.format.day(day.date),
        value: day.clicks,
        display: this.format.count(day.clicks),
      })),
  );

  /**
   * Property impressions
   * @readonly
   *
   * @description
   * Impressions per day.
   *
   * @type {Signal<readonly ChartPoint[]>}
   */
  protected readonly impressions: Signal<readonly ChartPoint[]> = computed<readonly ChartPoint[]>(
    (): readonly ChartPoint[] =>
      this.data().daily.map((day: SearchConsoleData['daily'][number]): ChartPoint => ({
        label: this.format.day(day.date),
        value: day.impressions,
        display: this.format.count(day.impressions),
      })),
  );

  /**
   * Property ctr
   * @readonly
   *
   * @description
   * Click-through rate of each day, a ratio drawn as a line.
   *
   * @type {Signal<readonly ChartSeries[]>}
   */
  protected readonly ctr: Signal<readonly ChartSeries[]> = computed<readonly ChartSeries[]>(
    (): readonly ChartSeries[] => [
      {
        key: 'ctr',
        label: $localize`:@@admin.dashboard.searchConsole.ctr:CTR`,
        tone: 'chart-1',
        points: this.data().daily.map((day: SearchConsoleData['daily'][number]): ChartPoint => ({
          label: this.format.day(day.date),
          value: day.ctr,
          display: this.format.percent(day.ctr),
        })),
      },
    ],
  );

  /**
   * Property position
   * @readonly
   *
   * @description
   * Average position of each day, drawn inverted (first place at the top); a day without impressions
   * has no position and is left out.
   *
   * @type {Signal<readonly ChartSeries[]>}
   */
  protected readonly position: Signal<readonly ChartSeries[]> = computed<readonly ChartSeries[]>(
    (): readonly ChartSeries[] => [
      {
        key: 'position',
        label: $localize`:@@admin.dashboard.searchConsole.position:Position moyenne`,
        tone: 'chart-1',
        points: this.data()
          .daily.filter((day: SearchConsoleData['daily'][number]): boolean => day.position > 0)
          .map((day: SearchConsoleData['daily'][number]): ChartPoint => ({
            label: this.format.day(day.date),
            value: day.position,
            display: this.format.decimal(day.position),
          })),
      },
    ],
  );

  /**
   * Property opportunities
   * @readonly
   *
   * @description
   * Queries placed by average position and CTR; a query without a position is left out.
   *
   * @type {Signal<readonly ScatterPoint[]>}
   */
  protected readonly opportunities: Signal<readonly ScatterPoint[]> = computed<
    readonly ScatterPoint[]
  >((): readonly ScatterPoint[] =>
    this.data()
      .queries.filter((row: SearchRow): boolean => row.position > 0)
      .map((row: SearchRow): ScatterPoint => ({
        key: row.key,
        label: row.key,
        x: row.position,
        y: row.ctr,
        xDisplay: this.format.decimal(row.position),
        yDisplay: this.format.percent(row.ctr),
      })),
  );

  /**
   * Property deviceLegend
   * @readonly
   *
   * @description
   * Devices of the window in their fixed order and tones, then any unknown device in grey.
   *
   * @type {Signal<readonly ChartLegendEntry[]>}
   */
  protected readonly deviceLegend: Signal<readonly ChartLegendEntry[]> = computed<
    readonly ChartLegendEntry[]
  >((): readonly ChartLegendEntry[] => {
    const keys: string[] = this.data().devices.map((row: SearchRow): string =>
      row.key.toLowerCase(),
    );
    const known: ChartLegendEntry[] = SEO_DEVICE_ORDER.filter(
      (device: { readonly key: string }): boolean => keys.includes(device.key),
    ).map(
      (device: {
        readonly key: string;
        readonly tone: ChartLegendEntry['tone'];
      }): ChartLegendEntry => ({
        key: device.key,
        label: SEO_DEVICE_LABELS[device.key] ?? device.key,
        tone: device.tone,
      }),
    );
    const other: ChartLegendEntry[] = keys
      .filter(
        (key: string): boolean =>
          !SEO_DEVICE_ORDER.some((device: { readonly key: string }): boolean => device.key === key),
      )
      .map((key: string): ChartLegendEntry => ({ key, label: key, tone: 'muted' }));
    return [...known, ...other];
  });

  /**
   * Property devices
   * @readonly
   *
   * @description
   * The window's clicks split by device, one whole read at a glance.
   *
   * @type {Signal<readonly StackedBarRow[]>}
   */
  protected readonly devices: Signal<readonly StackedBarRow[]> = computed<readonly StackedBarRow[]>(
    (): readonly StackedBarRow[] => {
      const rows: readonly SearchRow[] = this.data().devices;
      const total: number = rows.reduce(
        (sum: number, row: SearchRow): number => sum + row.clicks,
        0,
      );
      return [
        {
          key: 'clicks',
          label: $localize`:@@admin.dashboard.searchConsole.clicks:Clics`,
          display: this.format.count(total),
          segments: rows.map((row: SearchRow): StackedBarSegment => ({
            key: row.key.toLowerCase(),
            value: row.clicks,
            display: this.format.count(row.clicks),
          })),
        },
      ];
    },
  );

  /**
   * Property queryColumns
   * @readonly
   *
   * @description
   * Columns of the top queries.
   *
   * @type {readonly DataTableColumn<SearchRow>[]}
   */
  protected readonly queryColumns: readonly DataTableColumn<SearchRow>[] = this.columns(
    $localize`:@@admin.dashboard.searchConsole.query:Requête`,
    (row: SearchRow): string => row.key,
  );

  /**
   * Property pageColumns
   * @readonly
   *
   * @description
   * Columns of the top pages, each named by its path.
   *
   * @type {readonly DataTableColumn<SearchRow>[]}
   */
  protected readonly pageColumns: readonly DataTableColumn<SearchRow>[] = this.columns(
    $localize`:@@admin.dashboard.searchConsole.page:Page`,
    (row: SearchRow): string => pagePath(row.key),
  );

  /**
   * Property rowKey
   * @readonly
   *
   * @description
   * Identity of a row, its query or URL.
   *
   * @type {(row: SearchRow) => string}
   */
  protected readonly rowKey: (row: SearchRow) => string = (row: SearchRow): string => row.key;
  // #endregion

  // #region Methods
  /**
   * Method columns
   * @method columns
   *
   * @description
   * Columns of a top list: its name, then clicks, impressions, CTR and position, each sortable on
   * its raw value (a position of 0, without impressions, sorts last).
   *
   * @param {string} header - Heading of the name column.
   * @param {(row: SearchRow) => string} name - Name of a row.
   *
   * @returns {readonly DataTableColumn<SearchRow>[]} Columns.
   */
  private columns(
    header: string,
    name: (row: SearchRow) => string,
  ): readonly DataTableColumn<SearchRow>[] {
    const format: SeoFormatter = this.format;
    return [
      {
        id: 'key',
        header,
        cell: name,
        sortable: true,
        width: 280,
        minWidth: 160,
        maxWidth: 1200,
        class: 'truncate',
      },
      {
        id: 'clicks',
        width: 96,
        header: $localize`:@@admin.dashboard.searchConsole.clicks:Clics`,
        cell: (row: SearchRow): string => format.count(row.clicks),
        sortValue: (row: SearchRow): number => row.clicks,
        sortable: true,
        align: 'end',
        class: 'tabular-nums',
      },
      {
        id: 'impressions',
        width: 120,
        header: $localize`:@@admin.dashboard.searchConsole.impressions:Impressions`,
        cell: (row: SearchRow): string => format.count(row.impressions),
        sortValue: (row: SearchRow): number => row.impressions,
        sortable: true,
        align: 'end',
        class: 'tabular-nums',
      },
      {
        id: 'ctr',
        width: 96,
        header: $localize`:@@admin.dashboard.searchConsole.ctr:CTR`,
        cell: (row: SearchRow): string => format.percent(row.ctr),
        sortValue: (row: SearchRow): number => row.ctr,
        sortable: true,
        align: 'end',
        class: 'tabular-nums',
      },
      {
        id: 'position',
        width: 104,
        header: $localize`:@@admin.dashboard.searchConsole.positionShort:Position`,
        cell: (row: SearchRow): string => (row.position > 0 ? format.decimal(row.position) : '—'),
        sortValue: (row: SearchRow): number | null => (row.position > 0 ? row.position : null),
        sortable: true,
        align: 'end',
        class: 'tabular-nums',
      },
    ];
  }
  // #endregion
}
