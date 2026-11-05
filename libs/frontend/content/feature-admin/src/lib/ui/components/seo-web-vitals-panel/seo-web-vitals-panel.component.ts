import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import type { WebVitalsData } from '@vfortin/content-web-data-access/admin';
import {
  DataTableCellDirective,
  DataTableComponent,
  DataTableEmptyCellComponent,
  DumbbellChartComponent,
  StackedBarsComponent,
  TooltipDirective,
  type ChartLegendEntry,
  type DataTableColumn,
  type DumbbellRow,
  type StackedBarRow,
} from '@vfortin/ui';
import {
  SEO_SOURCE_ERROR_LABELS,
  SEO_STRATEGY_LABELS,
  SEO_VITAL_CATEGORY_LABELS,
} from '@internal/content-web-feature-admin/lib/constants/seo-dashboard-labels.constants';
import type { SeoFormatter } from '@internal/content-web-feature-admin/lib/models/seo-formatter/seo-formatter.interface';
import { SeoKpiTileComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-kpi-tile/seo-kpi-tile.component';
import { SeoSectionHeaderComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-section-header/seo-section-header.component';
import { SEO_VITAL_ICONS } from '@internal/content-web-feature-admin/lib/constants/seo-status-icons.constants';
import type { SeoStatusIcon } from '@internal/content-web-feature-admin/lib/models/seo-status-icon/seo-status-icon.interface';
import { seoFormatter } from '@internal/content-web-feature-admin/lib/utils/seo-format/seo-format.utils';

/**
 * Type VitalCategory
 *
 * @description
 * Category of a field metric or of the lab score.
 */
type VitalCategory = 'good' | 'needs-improvement' | 'poor';

/**
 * Type VitalsSource
 *
 * @description
 * One PageSpeed Insights row of the report.
 */
type VitalsSource = WebVitalsData['rows'][number];

/**
 * Interface VitalCell
 *
 * @description
 * One measured value with its category.
 */
interface VitalCell {
  readonly display: string;
  readonly category: VitalCategory;
  readonly status: SeoStatusIcon;
  readonly word: string;
}

/**
 * Interface VitalsRow
 *
 * @description
 * One URL × strategy row of the table.
 */
interface VitalsRow {
  readonly key: string;
  readonly path: string;
  readonly url: string;
  readonly strategy: string;
  readonly origin: boolean;
  readonly error: string | null;
  readonly lcp: VitalCell | null;
  readonly inp: VitalCell | null;
  readonly cls: VitalCell | null;
  readonly score: VitalCell | null;
  readonly scoreValue: number | null;
}

/**
 * Function scoreCategory
 *
 * @description
 * Category of a Lighthouse performance score: 90 and over good, 50 to 89 to improve, below 50
 * poor (Lighthouse's own bands).
 *
 * @param {number} score - Score from 0 to 100.
 *
 * @returns {VitalCategory} Category.
 */
function scoreCategory(score: number): VitalCategory {
  return score >= 90 ? 'good' : score >= 50 ? 'needs-improvement' : 'poor';
}

/**
 * Function pathOf
 *
 * @description
 * Path of an absolute URL, the URL itself when it does not parse.
 *
 * @param {string} url - URL.
 *
 * @returns {string} Path with its query.
 */
function pathOf(url: string): string {
  try {
    const parsed: URL = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

/**
 * Component SeoWebVitalsPanelComponent
 * @class SeoWebVitalsPanelComponent
 *
 * @description
 * Core Web Vitals tab of the « Tableau de bord » (D47, D51), full width: a strip of figure cells
 * (measures, failed measures, median lab score per strategy); the share of measures in each category
 * per metric as status-toned stacked bars, named by their legend; each page's mobile and desktop lab
 * scores as a dumbbell on the 0–100 scale; then one table row per key URL and strategy: the field
 * LCP, INP and CLS at the 75th percentile (CrUX) and the lab performance score, each with a status
 * icon, its word as a tooltip and hidden text (« Bon », « À améliorer », « Mauvais »), never colour alone. A row measured on the
 * origin's data rather than the URL's says so; a row PageSpeed could not measure shows the reason.
 */
@Component({
  selector: 'content-seo-web-vitals-panel',
  imports: [
    DataTableCellDirective,
    DataTableComponent,
    DataTableEmptyCellComponent,
    DumbbellChartComponent,
    NgIcon,
    NgTemplateOutlet,
    SeoKpiTileComponent,
    SeoSectionHeaderComponent,
    StackedBarsComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col' },
  templateUrl: './seo-web-vitals-panel.component.html',
})
export class SeoWebVitalsPanelComponent {
  // #region Properties
  /**
   * Property data
   * @readonly
   *
   * @description
   * PageSpeed Insights report.
   *
   * @type {InputSignal<WebVitalsData>}
   */
  public readonly data: InputSignal<WebVitalsData> = input.required<WebVitalsData>();

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
   * Property rows
   * @readonly
   *
   * @description
   * Table rows.
   *
   * @type {Signal<readonly VitalsRow[]>}
   */
  protected readonly rows: Signal<readonly VitalsRow[]> = computed<readonly VitalsRow[]>(
    (): readonly VitalsRow[] =>
      this.data().rows.map((row: VitalsSource): VitalsRow => {
        const field: NonNullable<VitalsSource['measure']>['field'] | null =
          row.measure?.field ?? null;
        const score: number | null = row.measure?.lab.performanceScore ?? null;
        return {
          key: `${row.url}|${row.strategy}`,
          path: pathOf(row.url),
          url: row.url,
          strategy: SEO_STRATEGY_LABELS[row.strategy],
          origin: field?.scope === 'origin',
          error: row.error ? SEO_SOURCE_ERROR_LABELS[row.error.code] : null,
          lcp: field?.lcp
            ? this.cell(this.format.seconds(field.lcp.p75), field.lcp.category)
            : null,
          inp: field?.inp
            ? this.cell(this.format.milliseconds(field.inp.p75), field.inp.category)
            : null,
          cls: field?.cls ? this.cell(this.format.shift(field.cls.p75), field.cls.category) : null,
          score: score === null ? null : this.cell(this.format.count(score), scoreCategory(score)),
          scoreValue: score,
        };
      }),
  );

  /**
   * Property categoryLegend
   * @readonly
   *
   * @description
   * The three categories of Google's thresholds, in their status tones: the colour means the verdict.
   *
   * @type {readonly ChartLegendEntry[]}
   */
  protected readonly categoryLegend: readonly ChartLegendEntry[] = [
    { key: 'good', label: SEO_VITAL_CATEGORY_LABELS.good, tone: 'success' },
    {
      key: 'needs-improvement',
      label: SEO_VITAL_CATEGORY_LABELS['needs-improvement'],
      tone: 'warning',
    },
    { key: 'poor', label: SEO_VITAL_CATEGORY_LABELS.poor, tone: 'danger' },
  ];

  /**
   * Property figures
   * @readonly
   *
   * @description
   * Figure cells: the measures, those that failed and the median lab score of each strategy.
   *
   * @type {Signal<readonly { id: string; label: string; value: string }[]>}
   */
  protected readonly figures: Signal<
    readonly { readonly id: string; readonly label: string; readonly value: string }[]
  > = computed((): { id: string; label: string; value: string }[] => {
    const rows: readonly VitalsRow[] = this.rows();
    const median = (strategy: 'mobile' | 'desktop'): string => {
      const scores: number[] = this.data()
        .rows.filter((row: VitalsSource): boolean => row.strategy === strategy)
        .map((row: VitalsSource): number | null => row.measure?.lab.performanceScore ?? null)
        .filter((score: number | null): score is number => score !== null)
        .sort((a: number, b: number): number => a - b);
      if (scores.length === 0) return '—';
      const middle: number = Math.floor(scores.length / 2);
      const value: number =
        scores.length % 2
          ? (scores[middle] ?? 0)
          : ((scores[middle - 1] ?? 0) + (scores[middle] ?? 0)) / 2;
      return this.format.count(value);
    };
    return [
      {
        id: 'measures',
        label: $localize`:@@admin.dashboard.vitals.figures.measures:Mesures`,
        value: this.format.count(rows.length),
      },
      {
        id: 'failed',
        label: $localize`:@@admin.dashboard.vitals.figures.failed:Mesures impossibles`,
        value: this.format.count(
          rows.filter((row: VitalsRow): boolean => row.error !== null).length,
        ),
      },
      {
        id: 'mobile',
        label: $localize`:@@admin.dashboard.vitals.figures.mobile:Score labo médian, mobile`,
        value: median('mobile'),
      },
      {
        id: 'desktop',
        label: $localize`:@@admin.dashboard.vitals.figures.desktop:Score labo médian, ordinateur`,
        value: median('desktop'),
      },
    ];
  });

  /**
   * Property distribution
   * @readonly
   *
   * @description
   * Per metric, how many measured rows fall in each category; a metric without any measure is left
   * out.
   *
   * @type {Signal<readonly StackedBarRow[]>}
   */
  protected readonly distribution: Signal<readonly StackedBarRow[]> = computed<
    readonly StackedBarRow[]
  >((): readonly StackedBarRow[] => {
    const metrics: readonly { key: 'lcp' | 'inp' | 'cls' | 'score'; label: string }[] = [
      { key: 'lcp', label: 'LCP' },
      { key: 'inp', label: 'INP' },
      { key: 'cls', label: 'CLS' },
      { key: 'score', label: $localize`:@@admin.dashboard.vitals.score:Score labo` },
    ];
    return metrics.flatMap(
      (metric: { key: 'lcp' | 'inp' | 'cls' | 'score'; label: string }): StackedBarRow[] => {
        const cells: VitalCell[] = this.rows()
          .map((row: VitalsRow): VitalCell | null => row[metric.key])
          .filter((cell: VitalCell | null): cell is VitalCell => cell !== null);
        if (cells.length === 0) return [];
        return [
          {
            key: metric.key,
            label: metric.label,
            display: this.measureCount(cells.length),
            segments: this.categoryLegend.map((entry: ChartLegendEntry) => {
              const count: number = cells.filter(
                (cell: VitalCell): boolean => cell.category === entry.key,
              ).length;
              return { key: entry.key, value: count, display: this.measureCount(count) };
            }),
          },
        ];
      },
    );
  });

  /**
   * Property scores
   * @readonly
   *
   * @description
   * Each key URL's lab score on mobile and on desktop.
   *
   * @type {Signal<readonly DumbbellRow[]>}
   */
  protected readonly scores: Signal<readonly DumbbellRow[]> = computed<readonly DumbbellRow[]>(
    (): readonly DumbbellRow[] => {
      const byUrl: Map<string, { mobile: number | null; desktop: number | null }> = new Map();
      for (const row of this.data().rows) {
        const entry: { mobile: number | null; desktop: number | null } = byUrl.get(row.url) ?? {
          mobile: null,
          desktop: null,
        };
        entry[row.strategy] = row.measure?.lab.performanceScore ?? null;
        byUrl.set(row.url, entry);
      }
      const end = (value: number | null): { value: number; display: string } | null =>
        value === null ? null : { value, display: this.format.count(value) };
      return [...byUrl].map(
        ([url, entry]: [
          string,
          { mobile: number | null; desktop: number | null },
        ]): DumbbellRow => ({
          key: url,
          label: pathOf(url),
          start: end(entry.mobile),
          end: end(entry.desktop),
        }),
      );
    },
  );

  /**
   * Property columns
   * @readonly
   *
   * @description
   * Columns of the table.
   *
   * @type {readonly DataTableColumn<VitalsRow>[]}
   */
  protected readonly columns: readonly DataTableColumn<VitalsRow>[] = [
    {
      id: 'page',
      header: $localize`:@@admin.dashboard.searchConsole.page:Page`,
      cell: (row: VitalsRow): string => row.path,
      sortable: true,
      width: 240,
      minWidth: 160,
      maxWidth: 1200,
    },
    {
      id: 'strategy',
      width: 104,
      header: $localize`:@@admin.dashboard.vitals.strategy:Appareil`,
      cell: (row: VitalsRow): string => row.strategy,
      sortable: true,
    },
    {
      id: 'lcp',
      width: 136,
      header: 'LCP',
      sortValue: (row: VitalsRow): number | null => this.p75(row, 'lcp'),
      sortable: true,
    },
    {
      id: 'inp',
      width: 136,
      header: 'INP',
      sortValue: (row: VitalsRow): number | null => this.p75(row, 'inp'),
      sortable: true,
    },
    {
      id: 'cls',
      width: 136,
      header: 'CLS',
      sortValue: (row: VitalsRow): number | null => this.p75(row, 'cls'),
      sortable: true,
    },
    {
      id: 'score',
      width: 136,
      header: $localize`:@@admin.dashboard.vitals.score:Score labo`,
      sortValue: (row: VitalsRow): number | null => row.scoreValue,
      sortable: true,
    },
  ];

  /**
   * Property rowKey
   * @readonly
   *
   * @description
   * Identity of a row, its URL and strategy.
   *
   * @type {(row: VitalsRow) => string}
   */
  protected readonly rowKey: (row: VitalsRow) => string = (row: VitalsRow): string => row.key;
  // #endregion

  // #region Methods
  /**
   * Method measureCount
   * @method measureCount
   *
   * @description
   * Count of measures with its noun, singular below two.
   *
   * @param {number} count - Number of measures.
   * @returns {string} Formatted count.
   */
  private measureCount(count: number): string {
    return count < 2
      ? $localize`:@@admin.dashboard.vitals.measureCount.one:${this.format.count(count)}:count: mesure`
      : $localize`:@@admin.dashboard.vitals.measureCount.other:${this.format.count(count)}:count: mesures`;
  }

  /**
   * Method cell
   * @method cell
   *
   * @description
   * Measured value with its category's status family and word.
   *
   * @param {string} display - Formatted value.
   * @param {VitalCategory} category - Category.
   *
   * @returns {VitalCell} Cell.
   */
  private cell(display: string, category: VitalCategory): VitalCell {
    return {
      display,
      category,
      status: SEO_VITAL_ICONS[category],
      word: SEO_VITAL_CATEGORY_LABELS[category],
    };
  }

  /**
   * Method p75
   * @method p75
   *
   * @description
   * Raw 75th percentile of a field metric of a row, for sorting.
   *
   * @param {VitalsRow} row - Row.
   * @param {'lcp' | 'inp' | 'cls'} metric - Metric.
   *
   * @returns {number | null} Value, `null` without field data.
   */
  private p75(row: VitalsRow, metric: 'lcp' | 'inp' | 'cls'): number | null {
    const source: VitalsSource | undefined = this.data().rows.find(
      (candidate: VitalsSource): boolean => `${candidate.url}|${candidate.strategy}` === row.key,
    );
    return source?.measure?.field?.[metric]?.p75 ?? null;
  }
  // #endregion
}
