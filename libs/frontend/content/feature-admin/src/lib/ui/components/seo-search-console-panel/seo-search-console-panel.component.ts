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
  AreaChartComponent,
  BarListComponent,
  CARD_IMPORTS,
  DataTableComponent,
  type BarListItem,
  type ChartPoint,
  type DataTableColumn,
} from '@vfortin/ui';
import { SEO_DEVICE_LABELS } from '@internal/content-web-feature-admin/lib/constants/seo-dashboard-labels.constants';
import type { SeoDelta } from '@internal/content-web-feature-admin/lib/models/seo-delta/seo-delta.interface';
import type { SeoFormatter } from '@internal/content-web-feature-admin/lib/models/seo-formatter/seo-formatter.interface';
import { SeoKpiTileComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-kpi-tile/seo-kpi-tile.component';
import {
  positionDelta,
  relativeDelta,
} from '@internal/content-web-feature-admin/lib/utils/seo-delta/seo-delta.utils';
import { seoFormatter } from '@internal/content-web-feature-admin/lib/utils/seo-format/seo-format.utils';

/**
 * Type SearchRow
 *
 * @description
 * One query, page or device of the report.
 */
type SearchRow = SearchConsoleData['queries'][number];

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
 * Search Console report of the « Tableau de bord » (D47): four stat tiles (clics, impressions, CTR,
 * average position, lower being better) with their change against the period before; clicks and
 * impressions per day as two charts, never one chart with two scales; the top queries and pages in
 * sortable tables; clicks per device as ranked bars. `stale` dims it while another window loads.
 */
@Component({
  selector: 'content-seo-search-console-panel',
  imports: [
    AreaChartComponent,
    BarListComponent,
    CARD_IMPORTS,
    DataTableComponent,
    SeoKpiTileComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-3' },
  templateUrl: './seo-search-console-panel.component.html',
})
export class SeoSearchConsolePanelComponent {
  // #region Properties
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
        id: 'clicks',
        label: $localize`:@@admin.dashboard.searchConsole.clicks:Clics`,
        value: format.count(totals.clicks),
        delta: relativeDelta(totals.clicks, previous.clicks, format),
      },
      {
        id: 'impressions',
        label: $localize`:@@admin.dashboard.searchConsole.impressions:Impressions`,
        value: format.count(totals.impressions),
        delta: relativeDelta(totals.impressions, previous.impressions, format),
      },
      {
        id: 'ctr',
        label: $localize`:@@admin.dashboard.searchConsole.ctr:CTR`,
        value: format.percent(totals.ctr),
        delta: relativeDelta(totals.ctr, previous.ctr, format),
      },
      {
        id: 'position',
        label: $localize`:@@admin.dashboard.searchConsole.position:Position moyenne`,
        value: totals.position > 0 ? format.decimal(totals.position) : '—',
        delta: positionDelta(totals.position, previous.position, format),
      },
    ];
  });

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
   * Property devices
   * @readonly
   *
   * @description
   * Clicks per device, most first, with their share.
   *
   * @type {Signal<readonly BarListItem[]>}
   */
  protected readonly devices: Signal<readonly BarListItem[]> = computed<readonly BarListItem[]>(
    (): readonly BarListItem[] => {
      const rows: readonly SearchRow[] = [...this.data().devices].sort(
        (a: SearchRow, b: SearchRow): number => b.clicks - a.clicks,
      );
      const total: number = rows.reduce(
        (sum: number, row: SearchRow): number => sum + row.clicks,
        0,
      );
      return rows.map((row: SearchRow): BarListItem => ({
        key: row.key,
        label: SEO_DEVICE_LABELS[row.key.toLowerCase()] ?? row.key,
        value: row.clicks,
        display:
          total > 0
            ? `${this.format.count(row.clicks)} · ${this.format.percent(row.clicks / total)}`
            : this.format.count(row.clicks),
      }));
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
      { id: 'key', header, cell: name, sortable: true, class: 'max-w-0 w-full truncate' },
      {
        id: 'clicks',
        header: $localize`:@@admin.dashboard.searchConsole.clicks:Clics`,
        cell: (row: SearchRow): string => format.count(row.clicks),
        sortValue: (row: SearchRow): number => row.clicks,
        sortable: true,
        align: 'end',
        class: 'tabular-nums',
      },
      {
        id: 'impressions',
        header: $localize`:@@admin.dashboard.searchConsole.impressions:Impressions`,
        cell: (row: SearchRow): string => format.count(row.impressions),
        sortValue: (row: SearchRow): number => row.impressions,
        sortable: true,
        align: 'end',
        class: 'tabular-nums',
      },
      {
        id: 'ctr',
        header: $localize`:@@admin.dashboard.searchConsole.ctr:CTR`,
        cell: (row: SearchRow): string => format.percent(row.ctr),
        sortValue: (row: SearchRow): number => row.ctr,
        sortable: true,
        align: 'end',
        class: 'tabular-nums',
      },
      {
        id: 'position',
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
