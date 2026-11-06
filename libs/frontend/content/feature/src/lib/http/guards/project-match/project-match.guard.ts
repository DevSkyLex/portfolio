import type { CanMatchFn } from '@angular/router';
import { loadSiteContent } from '@vfortin/content-web-data-access';

/** Missing projects fall through to the shell's real not-found route, preserving the requested URL. */
export const projectMatchGuard: CanMatchFn = (_route, segments) =>
  loadSiteContent().then((content): boolean => {
    const slug: string | undefined = segments[1]?.path;
    return slug !== undefined && content.project(slug) !== null;
  });
