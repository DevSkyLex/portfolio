import {
  lucideCircleCheck,
  lucideClock,
  lucideOctagonAlert,
  lucidePlugZap,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import type { SeoDashboard } from '@vfortin/content-web-data-access/admin';
import type { SeoFormatter } from '@internal/content-web-feature-admin/lib/models/seo-formatter/seo-formatter.interface';
import type { SeoSectionView } from '@internal/content-web-feature-admin/lib/models/seo-section-view/seo-section-view.interface';
import type { SeoSourceStatus } from '@internal/content-web-feature-admin/lib/models/seo-source-status/seo-source-status.interface';
import { seoSectionView } from '@internal/content-web-feature-admin/lib/utils/seo-section/seo-section.utils';

/**
 * Function googleSourceStatus
 *
 * @description
 * State of a Google source: collected (success ink), failed with the last good report kept
 * (warning) or without any (danger), waiting for its first collection or not configured (faint).
 *
 * @param {SeoSourceStatus['id']} id - Source.
 * @param {string} name - Product name.
 * @param {SeoSectionView<unknown>} view - Section of the dashboard.
 * @param {SeoFormatter} format - Formatters.
 * @returns {SeoSourceStatus} State of the source.
 */
function googleSourceStatus(
  id: SeoSourceStatus['id'],
  name: string,
  view: SeoSectionView<unknown>,
  format: SeoFormatter,
): SeoSourceStatus {
  switch (view.status) {
    case 'ok': {
      const at: string = format.dateTime(view.fetchedAt ?? '');
      return {
        id,
        name,
        detail: $localize`:@@admin.dashboard.sources.fetched:Collecté le ${at}:time:`,
        status: { icon: lucideCircleCheck, classes: 'inline-flex shrink-0 text-success-ink' },
      };
    }
    case 'error': {
      const at: string = format.dateTime(view.attemptedAt ?? '');
      return view.data
        ? {
            id,
            name,
            detail: $localize`:@@admin.dashboard.sources.failedKept:Échec le ${at}:time:, dernier rapport conservé`,
            status: { icon: lucideTriangleAlert, classes: 'inline-flex shrink-0 text-warning-ink' },
          }
        : {
            id,
            name,
            detail: $localize`:@@admin.dashboard.sources.failed:Échec le ${at}:time:`,
            status: { icon: lucideOctagonAlert, classes: 'inline-flex shrink-0 text-danger-ink' },
          };
    }
    case 'pending':
      return {
        id,
        name,
        detail: $localize`:@@admin.dashboard.sources.pending:En attente de la première collecte`,
        status: { icon: lucideClock, classes: 'inline-flex shrink-0 text-fg-faint' },
      };
    case 'not-configured':
      return {
        id,
        name,
        detail: $localize`:@@admin.dashboard.sources.notConfigured:Non configuré`,
        status: { icon: lucidePlugZap, classes: 'inline-flex shrink-0 text-fg-faint' },
      };
  }
}

/**
 * Function seoSourceStatuses
 *
 * @description
 * Collection state of every source of the dashboard, in tab order: the three Google sources, then
 * the internal audit, computed on each read of the dashboard.
 *
 * @param {SeoDashboard} dashboard - Dashboard shown.
 * @param {SeoFormatter} format - Formatters of the build locale.
 * @returns {SeoSourceStatus[]} States of the sources.
 */
export function seoSourceStatuses(
  dashboard: SeoDashboard,
  format: SeoFormatter,
): SeoSourceStatus[] {
  const audited: string = format.dateTime(dashboard.audit.generatedAt);
  return [
    googleSourceStatus(
      'search-console',
      'Search Console',
      seoSectionView<unknown>(dashboard.searchConsole),
      format,
    ),
    googleSourceStatus(
      'analytics',
      'Google Analytics',
      seoSectionView<unknown>(dashboard.analytics),
      format,
    ),
    googleSourceStatus(
      'web-vitals',
      'PageSpeed Insights',
      seoSectionView<unknown>(dashboard.webVitals),
      format,
    ),
    {
      id: 'audit',
      name: $localize`:@@admin.dashboard.audit.title:Audit SEO`,
      detail: $localize`:@@admin.dashboard.sources.audited:Calculé le ${audited}:time:`,
      status: { icon: lucideCircleCheck, classes: 'inline-flex shrink-0 text-success-ink' },
    },
  ];
}
