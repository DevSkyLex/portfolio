import { Injector, inject } from '@angular/core';
import { SiteContentService } from '@internal/content-web-data-access/lib/services/site-content/site-content.service';
import { CONTENT_SNAPSHOT_READY } from '@internal/content-web-data-access/lib/tokens/content-snapshot/content-snapshot-ready.token';

/**
 * Loads public content from a route or prerender parameter factory without delaying admin bootstrap.
 * Capture the injector before awaiting: Angular's injection context does not cross promise callbacks.
 */
export function loadSiteContent(): Promise<SiteContentService> {
  const injector: Injector = inject<Injector>(Injector);
  const ready: () => Promise<void> = inject<() => Promise<void>>(CONTENT_SNAPSHOT_READY);
  return ready().then((): SiteContentService =>
    injector.get<SiteContentService>(SiteContentService),
  );
}
