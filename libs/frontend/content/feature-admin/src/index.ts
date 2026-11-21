/**
 * Export ADMIN_CONTENT_ROUTES
 *
 * @description
 * Administrator article routes mounted under the shell's `/admin/articles` path.
 */
export { ADMIN_CONTENT_ROUTES } from '@internal/content-web-feature-admin/lib/admin-content.routes';

/**
 * Export ADMIN_DASHBOARD_ROUTES
 *
 * @description
 * « Tableau de bord » (SEO dashboard) route, mounted by the shell under `/admin/dashboard`.
 */
export { ADMIN_DASHBOARD_ROUTES } from '@internal/content-web-feature-admin/lib/admin-dashboard.routes';

/**
 * Export ADMIN_EXPERIENCE_ROUTES, ADMIN_EDUCATION_ROUTES
 *
 * @description
 * « Expériences » and « Formations » administration routes, mounted by the shell under
 * `/admin/experiences` and `/admin/education`.
 */
export {
  ADMIN_EDUCATION_ROUTES,
  ADMIN_EXPERIENCE_ROUTES,
} from '@internal/content-web-feature-admin/lib/admin-timeline.routes';

/**
 * Export ADMIN_FAQ_ROUTES
 *
 * @description
 * « FAQ » administration routes, mounted by the shell under `/admin/faq`.
 */
export { ADMIN_FAQ_ROUTES } from '@internal/content-web-feature-admin/lib/admin-faq.routes';

/**
 * Export ADMIN_MAINTENANCE_ROUTES
 *
 * @description
 * « Maintenance » administration route, mounted by the shell under `/admin/maintenance`.
 */
export { ADMIN_MAINTENANCE_ROUTES } from '@internal/content-web-feature-admin/lib/admin-maintenance.routes';

/**
 * Export ADMIN_INFORMATION_ROUTES, ADMIN_LEGAL_ROUTES
 *
 * @description
 * « Informations » and « Légal » administration routes, mounted by the shell under
 * `/admin/information` and `/admin/legal`.
 */
export {
  ADMIN_INFORMATION_ROUTES,
  ADMIN_LEGAL_ROUTES,
} from '@internal/content-web-feature-admin/lib/admin-site-texts.routes';
