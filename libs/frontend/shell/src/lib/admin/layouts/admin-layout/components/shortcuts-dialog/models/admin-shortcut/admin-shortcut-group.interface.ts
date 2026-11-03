import type { AdminShortcut } from '@internal/web-shell/lib/admin/layouts/admin-layout/components/shortcuts-dialog/models/admin-shortcut/admin-shortcut.interface';

/**
 * Interface AdminShortcutGroup
 * @interface AdminShortcutGroup
 *
 * @description
 * Shortcuts of one administration area, under a heading of the help dialog.
 */
export interface AdminShortcutGroup {
  // #region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * French heading of the group.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property shortcuts
   * @readonly
   *
   * @description
   * Shortcuts of the group, in reading order.
   *
   * @type {readonly AdminShortcut[]}
   */
  readonly shortcuts: readonly AdminShortcut[];
  // #endregion
}
