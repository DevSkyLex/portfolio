import { API_PREFIX } from '@vfortin/web-http';

/**
 * Constant ADMIN_SEO_DASHBOARD_ENDPOINT
 *
 * @description
 * Administration endpoint of the SEO dashboard (D47), `?range=` selecting the window; `/refresh`
 * below it starts a refresh.
 */
export const ADMIN_SEO_DASHBOARD_ENDPOINT: string = `${API_PREFIX}/content/admin/seo/dashboard`;
