import type { CanMatchFn } from '@angular/router';
import { type SiteContentService, loadSiteContent } from '@vfortin/content-web-data-access';

/**
 * Function maintenanceGuard
 *
 * @description
 * Matches the maintenance route when the request's snapshot has the maintenance mode on, so every
 * public URL renders the maintenance screen instead of the site layout; the admin route is declared
 * before it and never reaches it. The server reads the snapshot per request and transfers it, so the
 * hydrating browser matches the same route (TransferState). A snapshot that cannot be read leaves the
 * site routes to answer as before (the public content guard turns the failure into a 503).
 *
 * @returns {Promise<boolean>} Whether the maintenance screen replaces the requested page.
 */
export const maintenanceGuard: CanMatchFn = (): Promise<boolean> =>
  loadSiteContent().then(
    (content: SiteContentService): boolean => content.maintenance().enabled,
    (): boolean => false,
  );
