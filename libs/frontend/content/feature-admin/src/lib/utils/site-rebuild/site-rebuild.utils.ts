import type { ToastService } from '@vfortin/ui';
import { SITE_REBUILD_NOTICE } from '@internal/content-web-feature-admin/lib/constants/site-rebuild-notice.constants';

/**
 * Function withSiteRebuildNotice
 *
 * @description
 * Description of a result toast for an action that changed the public site: the rebuild notice,
 * after the toast's own description when it has one, so that one action shows one toast.
 *
 * @param {string} [description] - Existing description of the result toast.
 *
 * @returns {string} Description ending with the rebuild notice.
 */
export function withSiteRebuildNotice(description?: string): string {
  return description ? `${description} ${SITE_REBUILD_NOTICE}` : SITE_REBUILD_NOTICE;
}

/**
 * Function notifySiteRebuild
 *
 * @description
 * Shows the rebuild notice as an info toast, for an action whose outcome has no result toast to
 * carry it; call it once per action, never per item of a bulk action.
 *
 * @param {ToastService} toasts - Toaster of the admin layout.
 *
 * @returns {string} Identifier of the info toast.
 */
export function notifySiteRebuild(toasts: ToastService): string {
  return toasts.info(SITE_REBUILD_NOTICE);
}
