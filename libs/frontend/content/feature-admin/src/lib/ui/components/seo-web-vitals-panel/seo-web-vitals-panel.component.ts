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
import type { WebVitalsData } from '@vfortin/content-web-data-access/admin';
import {
  BadgeDirective,
  DataTableCellDirective,
  DataTableComponent,
  DataTableEmptyCellComponent,
  type BadgeVariant,
  type DataTableColumn,
} from '@vfortin/ui';
import {
  SEO_SOURCE_ERROR_LABELS,
  SEO_STRATEGY_LABELS,
  SEO_VITAL_CATEGORY_LABELS,
} from '@internal/content-web-feature-admin/lib/constants/seo-dashboard-labels.constants';
import type { SeoFormatter } from '@internal/content-web-feature-admin/lib/models/seo-formatter/seo-formatter.interface';
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
  readonly variant: BadgeVariant;
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
 * Constant CATEGORY_VARIANTS
 *
 * @description
 * Status family of each category (D37).
 *
 * @type {Readonly<Record<VitalCategory, BadgeVariant>>}
 */
const CATEGORY_VARIANTS: Readonly<Record<VitalCategory, BadgeVariant>> = {
  good: 'success',
  'needs-improvement': 'warning',
  poor: 'danger',
};

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
 * Core Web Vitals of the « Tableau de bord » (D47), one row per key URL and strategy: the field
 * LCP, INP and CLS at the 75th percentile (CrUX) and the lab performance score, each with a status
 * dot and its word (« Bon », « À améliorer », « Mauvais »), never colour alone. A row measured on the
 * origin's data rather than the URL's says so; a row PageSpeed could not measure shows the reason.
 */
@Component({
  selector: 'content-seo-web-vitals-panel',
  imports: [
    BadgeDirective,
    DataTableCellDirective,
    DataTableComponent,
    DataTableEmptyCellComponent,
    NgTemplateOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-2' },
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
      class: 'max-w-0 w-full',
    },
    {
      id: 'strategy',
      header: $localize`:@@admin.dashboard.vitals.strategy:Appareil`,
      cell: (row: VitalsRow): string => row.strategy,
      sortable: true,
    },
    {
      id: 'lcp',
      header: 'LCP',
      sortValue: (row: VitalsRow): number | null => this.p75(row, 'lcp'),
      sortable: true,
    },
    {
      id: 'inp',
      header: 'INP',
      sortValue: (row: VitalsRow): number | null => this.p75(row, 'inp'),
      sortable: true,
    },
    {
      id: 'cls',
      header: 'CLS',
      sortValue: (row: VitalsRow): number | null => this.p75(row, 'cls'),
      sortable: true,
    },
    {
      id: 'score',
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
      variant: CATEGORY_VARIANTS[category],
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
