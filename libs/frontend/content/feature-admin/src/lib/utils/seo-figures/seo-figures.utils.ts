import type {
  AnalyticsData,
  SearchConsoleData,
  SeoAudit,
  WebVitalsData,
} from '@vfortin/content-web-data-access/admin';
import type { SeoFigure } from '@internal/content-web-feature-admin/lib/models/seo-figure/seo-figure.interface';
import type { SeoFormatter } from '@internal/content-web-feature-admin/lib/models/seo-formatter/seo-formatter.interface';
import {
  positionDelta,
  relativeDelta,
} from '@internal/content-web-feature-admin/lib/utils/seo-delta/seo-delta.utils';

/**
 * Function seoComparison
 *
 * @description
 * Name of the period a windowed report compares with (`vs 7 sept. – 4 oct. 2026`).
 *
 * @param {{ readonly start: string; readonly end: string }} previous - Period before.
 * @param {SeoFormatter} format - Formatters of the build locale.
 * @returns {string} Comparison label.
 */
export function seoComparison(
  previous: { readonly start: string; readonly end: string },
  format: SeoFormatter,
): string {
  const span: string = format.span(previous.start, previous.end);
  return $localize`:@@admin.dashboard.kpi.comparison:vs ${span}:span:`;
}

/**
 * Function searchConsoleFigures
 *
 * @description
 * Key figures of Search Console: clicks, impressions, CTR and the average position, lower being
 * better, each with its change against the period before.
 *
 * @param {SearchConsoleData} data - Report.
 * @param {SeoFormatter} format - Formatters.
 * @returns {SeoFigure[]} Figures.
 */
export function searchConsoleFigures(data: SearchConsoleData, format: SeoFormatter): SeoFigure[] {
  const { totals, previous } = data;
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
}

/**
 * Function analyticsFigures
 *
 * @description
 * Key figures of the audience: active users, sessions, views, engagement rate and average engagement
 * time, each with its change against the period before.
 *
 * @param {AnalyticsData} data - Report.
 * @param {SeoFormatter} format - Formatters.
 * @returns {SeoFigure[]} Figures.
 */
export function analyticsFigures(data: AnalyticsData, format: SeoFormatter): SeoFigure[] {
  const { totals, previous } = data;
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
}

/**
 * Function webVitalsFigures
 *
 * @description
 * Key figures of the Web Vitals: the measures, those PageSpeed could not take and the median lab
 * score of each strategy (`—` without any); no period to compare.
 *
 * @param {WebVitalsData} data - Report.
 * @param {SeoFormatter} format - Formatters.
 * @returns {SeoFigure[]} Figures.
 */
export function webVitalsFigures(data: WebVitalsData, format: SeoFormatter): SeoFigure[] {
  const median = (strategy: 'mobile' | 'desktop'): string => {
    const scores: number[] = data.rows
      .filter((row: WebVitalsData['rows'][number]): boolean => row.strategy === strategy)
      .map(
        (row: WebVitalsData['rows'][number]): number | null =>
          row.measure?.lab.performanceScore ?? null,
      )
      .filter((score: number | null): score is number => score !== null)
      .sort((a: number, b: number): number => a - b);
    if (scores.length === 0) return '—';
    const middle: number = Math.floor(scores.length / 2);
    const value: number =
      scores.length % 2
        ? (scores[middle] ?? 0)
        : ((scores[middle - 1] ?? 0) + (scores[middle] ?? 0)) / 2;
    return format.count(value);
  };
  return [
    {
      id: 'measures',
      label: $localize`:@@admin.dashboard.vitals.figures.measures:Mesures`,
      value: format.count(data.rows.length),
      delta: null,
    },
    {
      id: 'failed',
      label: $localize`:@@admin.dashboard.vitals.figures.failed:Mesures impossibles`,
      value: format.count(
        data.rows.filter((row: WebVitalsData['rows'][number]): boolean => row.error !== null)
          .length,
      ),
      delta: null,
    },
    {
      id: 'mobile',
      label: $localize`:@@admin.dashboard.vitals.figures.mobile:Score labo médian, mobile`,
      value: median('mobile'),
      delta: null,
    },
    {
      id: 'desktop',
      label: $localize`:@@admin.dashboard.vitals.figures.desktop:Score labo médian, ordinateur`,
      value: median('desktop'),
      delta: null,
    },
  ];
}

/**
 * Function auditFigures
 *
 * @description
 * Key figures of the audit: findings per severity, published projects and drafts, and the next
 * sitemap's URLs; no period to compare.
 *
 * @param {SeoAudit} audit - Audit.
 * @param {SeoFormatter} format - Formatters.
 * @returns {SeoFigure[]} Figures.
 */
export function auditFigures(audit: SeoAudit, format: SeoFormatter): SeoFigure[] {
  const { totals, sitemap } = audit;
  return [
    {
      id: 'error',
      label: $localize`:@@admin.dashboard.audit.totals.errors:Erreurs`,
      value: format.count(totals.issues.error),
      delta: null,
    },
    {
      id: 'warning',
      label: $localize`:@@admin.dashboard.audit.totals.warnings:Avertissements`,
      value: format.count(totals.issues.warning),
      delta: null,
    },
    {
      id: 'info',
      label: $localize`:@@admin.dashboard.audit.totals.infos:Infos`,
      value: format.count(totals.issues.info),
      delta: null,
    },
    {
      id: 'published',
      label: $localize`:@@admin.dashboard.audit.totals.published:Projets publiés`,
      value: format.count(totals.published),
      delta: null,
    },
    {
      id: 'drafts',
      label: $localize`:@@admin.dashboard.audit.totals.drafts:Brouillons`,
      value: format.count(totals.drafts),
      delta: null,
    },
    {
      id: 'sitemap',
      label: $localize`:@@admin.dashboard.audit.totals.sitemap:URL du sitemap`,
      value: format.count(sitemap.urls),
      delta: null,
    },
  ];
}
