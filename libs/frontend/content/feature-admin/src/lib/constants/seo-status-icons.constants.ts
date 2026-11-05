import {
  lucideCircleCheck,
  lucideInfo,
  lucideOctagonAlert,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import type { SeoStatusIcon } from '@internal/content-web-feature-admin/lib/models/seo-status-icon/seo-status-icon.interface';

/**
 * Constant SEO_VITAL_ICONS
 *
 * @description
 * Icons of Google's Web Vitals categories: a check for « Bon », a warning for « À améliorer », an
 * alert for « Mauvais ».
 *
 * @type {Readonly<Record<'good' | 'needs-improvement' | 'poor', SeoStatusIcon>>}
 */
export const SEO_VITAL_ICONS: Readonly<
  Record<'good' | 'needs-improvement' | 'poor', SeoStatusIcon>
> = {
  good: { icon: lucideCircleCheck, classes: 'inline-flex shrink-0 text-success-ink' },
  'needs-improvement': {
    icon: lucideTriangleAlert,
    classes: 'inline-flex shrink-0 text-warning-ink',
  },
  poor: { icon: lucideOctagonAlert, classes: 'inline-flex shrink-0 text-danger-ink' },
};

/**
 * Constant SEO_SEVERITY_ICONS
 *
 * @description
 * Icons of the audit severities: an alert for an error, a warning for a warning, an information sign
 * for an information.
 *
 * @type {Readonly<Record<'error' | 'warning' | 'info', SeoStatusIcon>>}
 */
export const SEO_SEVERITY_ICONS: Readonly<Record<'error' | 'warning' | 'info', SeoStatusIcon>> = {
  error: { icon: lucideOctagonAlert, classes: 'inline-flex shrink-0 text-danger-ink' },
  warning: { icon: lucideTriangleAlert, classes: 'inline-flex shrink-0 text-warning-ink' },
  info: { icon: lucideInfo, classes: 'inline-flex shrink-0 text-info-ink' },
};
