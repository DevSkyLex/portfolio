import type { CanDeactivateFn } from '@angular/router';

/**
 * Function leaveProjectEditor
 *
 * @description
 * Defers the route exit decision to the editor owner, including draft and accepted-write protection.
 *
 * @param {{canLeave: () => Promise<boolean>}} page - Routed editor exit contract.
 * @returns {Promise<boolean>} Whether navigation can continue.
 */
export const leaveProjectEditor: CanDeactivateFn<{ canLeave: () => Promise<boolean> }> = (page: {
  canLeave: () => Promise<boolean>;
}): Promise<boolean> => page.canLeave();
