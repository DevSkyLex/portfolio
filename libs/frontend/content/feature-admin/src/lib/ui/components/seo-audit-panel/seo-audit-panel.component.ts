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
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { lucideCircleCheck, lucideTriangleAlert } from '@ng-icons/lucide';
import type { SeoAudit, SeoAuditIssue } from '@vfortin/content-web-data-access/admin';
import {
  BarListComponent,
  DataTableCellDirective,
  DataTableComponent,
  DataTableEmptyDirective,
  EMPTY_IMPORTS,
  StackedBarsComponent,
  TooltipDirective,
  type BarListItem,
  type ChartLegendEntry,
  type DataTableColumn,
  type DataTableFacet,
  type StackedBarRow,
} from '@vfortin/ui';
import {
  SEO_AUDIT_CODE_LABELS,
  SEO_SEVERITY_LABELS,
} from '@internal/content-web-feature-admin/lib/constants/seo-dashboard-labels.constants';
import type { SeoFormatter } from '@internal/content-web-feature-admin/lib/models/seo-formatter/seo-formatter.interface';
import { SeoKpiTileComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-kpi-tile/seo-kpi-tile.component';
import { SeoSectionHeaderComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-section-header/seo-section-header.component';
import { SEO_SEVERITY_ICONS } from '@internal/content-web-feature-admin/lib/constants/seo-status-icons.constants';
import type { SeoStatusIcon } from '@internal/content-web-feature-admin/lib/models/seo-status-icon/seo-status-icon.interface';
import { seoAuditMessage } from '@internal/content-web-feature-admin/lib/utils/seo-audit-message/seo-audit-message.utils';
import { seoFormatter } from '@internal/content-web-feature-admin/lib/utils/seo-format/seo-format.utils';

/**
 * Type Severity
 *
 * @description
 * Severity of a finding.
 */
type Severity = SeoAuditIssue['severity'];

/**
 * Interface IssueRow
 *
 * @description
 * One finding of one project, a row of the table.
 */
interface IssueRow {
  readonly key: string;
  readonly projectId: string;
  readonly project: string;
  readonly severity: Severity;
  readonly severityLabel: string;
  readonly status: SeoStatusIcon;
  readonly locale: string;
  readonly message: string;
}

/**
 * Interface Total
 *
 * @description
 * One count tile.
 */
interface Total {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

/**
 * Constant SEVERITY_RANK
 *
 * @description
 * Sort rank of each severity, the most serious first.
 *
 * @type {Readonly<Record<Severity, number>>}
 */
const SEVERITY_RANK: Readonly<Record<Severity, number>> = { error: 0, warning: 1, info: 2 };

/**
 * Component SeoAuditPanelComponent
 * @class SeoAuditPanelComponent
 *
 * @description
 * Internal SEO audit tab of the « Tableau de bord » (D47, D51), full width: a strip of figure cells
 * (findings per severity, published projects and drafts, the next sitemap's URLs); when there are
 * findings, each project's findings split by severity as stacked bars on one scale and the findings
 * counted by kind as ranked bars; then a full-width table with one row per finding,
 * the most serious first, with its severity (icon, its word as a tooltip and hidden text), its project (a link to the
 * project editor), its language and the French message built from its code and measured length;
 * search and a severity facet narrow it.
 */
@Component({
  selector: 'content-seo-audit-panel',
  imports: [
    BarListComponent,
    DataTableCellDirective,
    DataTableComponent,
    DataTableEmptyDirective,
    EMPTY_IMPORTS,
    NgIcon,
    RouterLink,
    SeoKpiTileComponent,
    SeoSectionHeaderComponent,
    StackedBarsComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col' },
  templateUrl: './seo-audit-panel.component.html',
})
export class SeoAuditPanelComponent {
  // #region Properties
  /**
   * Property audit
   * @readonly
   *
   * @description
   * Audit computed with the dashboard.
   *
   * @type {InputSignal<SeoAudit>}
   */
  public readonly audit: InputSignal<SeoAudit> = input.required<SeoAudit>();

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
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the empty states.
   */
  protected readonly icons: { readonly clean: string; readonly none: string } = {
    clean: lucideCircleCheck,
    none: lucideTriangleAlert,
  } as const;

  /**
   * Property totals
   * @readonly
   *
   * @description
   * Count tiles.
   *
   * @type {Signal<readonly Total[]>}
   */
  protected readonly totals: Signal<readonly Total[]> = computed<readonly Total[]>(
    (): readonly Total[] => {
      const { totals, sitemap } = this.audit();
      const count: (value: number) => string = this.format.count;
      return [
        {
          id: 'error',
          label: $localize`:@@admin.dashboard.audit.totals.errors:Erreurs`,
          value: count(totals.issues.error),
        },
        {
          id: 'warning',
          label: $localize`:@@admin.dashboard.audit.totals.warnings:Avertissements`,
          value: count(totals.issues.warning),
        },
        {
          id: 'info',
          label: $localize`:@@admin.dashboard.audit.totals.infos:Infos`,
          value: count(totals.issues.info),
        },
        {
          id: 'published',
          label: $localize`:@@admin.dashboard.audit.totals.published:Projets publiés`,
          value: count(totals.published),
        },
        {
          id: 'drafts',
          label: $localize`:@@admin.dashboard.audit.totals.drafts:Brouillons`,
          value: count(totals.drafts),
        },
        {
          id: 'sitemap',
          label: $localize`:@@admin.dashboard.audit.totals.sitemap:URL du sitemap`,
          value: count(sitemap.urls),
        },
      ];
    },
  );

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Findings of every audited project, the most serious first, then by project and language.
   *
   * @type {Signal<readonly IssueRow[]>}
   */
  protected readonly rows: Signal<readonly IssueRow[]> = computed<readonly IssueRow[]>(
    (): readonly IssueRow[] =>
      this.audit()
        .projects.flatMap((project: SeoAudit['projects'][number]): IssueRow[] =>
          project.issues.map((issue: SeoAuditIssue, index: number): IssueRow => ({
            key: `${project.id}:${index}`,
            projectId: project.id,
            project: project.title,
            severity: issue.severity,
            severityLabel: SEO_SEVERITY_LABELS[issue.severity],
            status: SEO_SEVERITY_ICONS[issue.severity],
            locale: issue.locale ? issue.locale.toUpperCase() : '',
            message: seoAuditMessage(issue),
          })),
        )
        .sort(
          (a: IssueRow, b: IssueRow): number =>
            SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
        ),
  );

  /**
   * Property severityLegend
   * @readonly
   *
   * @description
   * Severities, most serious first, in their status tones.
   *
   * @type {readonly ChartLegendEntry[]}
   */
  protected readonly severityLegend: readonly ChartLegendEntry[] = [
    { key: 'error', label: SEO_SEVERITY_LABELS.error, tone: 'danger' },
    { key: 'warning', label: SEO_SEVERITY_LABELS.warning, tone: 'warning' },
    { key: 'info', label: SEO_SEVERITY_LABELS.info, tone: 'info' },
  ];

  /**
   * Property byProject
   * @readonly
   *
   * @description
   * Findings of each project with any, split by severity, the most findings first.
   *
   * @type {Signal<readonly StackedBarRow[]>}
   */
  protected readonly byProject: Signal<readonly StackedBarRow[]> = computed<
    readonly StackedBarRow[]
  >((): readonly StackedBarRow[] =>
    this.audit()
      .projects.filter(
        (project: SeoAudit['projects'][number]): boolean => project.issues.length > 0,
      )
      .sort(
        (a: SeoAudit['projects'][number], b: SeoAudit['projects'][number]): number =>
          b.issues.length - a.issues.length,
      )
      .map((project: SeoAudit['projects'][number]): StackedBarRow => ({
        key: project.id,
        label: project.title,
        display: this.format.count(project.issues.length),
        segments: this.severityLegend.map((entry: ChartLegendEntry) => {
          const count: number = project.issues.filter(
            (issue: SeoAuditIssue): boolean => issue.severity === entry.key,
          ).length;
          return { key: entry.key, value: count, display: this.format.count(count) };
        }),
      })),
  );

  /**
   * Property byKind
   * @readonly
   *
   * @description
   * Findings counted by code across the published projects, the most frequent first.
   *
   * @type {Signal<readonly BarListItem[]>}
   */
  protected readonly byKind: Signal<readonly BarListItem[]> = computed<readonly BarListItem[]>(
    (): readonly BarListItem[] => {
      const counts: Map<SeoAuditIssue['code'], number> = new Map();
      for (const project of this.audit().projects)
        for (const issue of project.issues)
          counts.set(issue.code, (counts.get(issue.code) ?? 0) + 1);
      return [...counts]
        .sort((a: [string, number], b: [string, number]): number => b[1] - a[1])
        .map(([code, count]: [SeoAuditIssue['code'], number]): BarListItem => ({
          key: code,
          label: SEO_AUDIT_CODE_LABELS[code],
          value: count,
          display: this.format.count(count),
        }));
    },
  );

  /**
   * Property columns
   * @readonly
   *
   * @description
   * Columns of the findings table.
   *
   * @type {readonly DataTableColumn<IssueRow>[]}
   */
  protected readonly columns: readonly DataTableColumn<IssueRow>[] = [
    {
      id: 'gravite',
      width: 88,
      maxWidth: 112,
      header: $localize`:@@admin.dashboard.audit.severity:Gravité`,
      sortValue: (row: IssueRow): number => SEVERITY_RANK[row.severity],
      sortable: true,
      searchable: false,
    },
    {
      id: 'projet',
      width: 176,
      header: $localize`:@@admin.dashboard.audit.project:Projet`,
      cell: (row: IssueRow): string => row.project,
      sortable: true,
    },
    {
      id: 'langue',
      width: 88,
      maxWidth: 112,
      header: $localize`:@@admin.dashboard.audit.locale:Langue`,
      cell: (row: IssueRow): string => row.locale,
      sortable: true,
    },
    {
      id: 'probleme',
      header: $localize`:@@admin.dashboard.audit.message:Problème`,
      cell: (row: IssueRow): string => row.message,
      width: 400,
      minWidth: 200,
      maxWidth: 1200,
    },
  ];

  /**
   * Property facets
   * @readonly
   *
   * @description
   * Severity facet of the table.
   *
   * @type {readonly DataTableFacet<IssueRow>[]}
   */
  protected readonly facets: readonly DataTableFacet<IssueRow>[] = [
    {
      id: 'gravite',
      label: $localize`:@@admin.dashboard.audit.severity:Gravité`,
      value: (row: IssueRow): string => row.severity,
      options: [
        { value: 'error', label: SEO_SEVERITY_LABELS.error },
        { value: 'warning', label: SEO_SEVERITY_LABELS.warning },
        { value: 'info', label: SEO_SEVERITY_LABELS.info },
      ],
    },
  ];

  /**
   * Property rowKey
   * @readonly
   *
   * @description
   * Identity of a finding row.
   *
   * @type {(row: IssueRow) => string}
   */
  protected readonly rowKey: (row: IssueRow) => string = (row: IssueRow): string => row.key;
  // #endregion
}
