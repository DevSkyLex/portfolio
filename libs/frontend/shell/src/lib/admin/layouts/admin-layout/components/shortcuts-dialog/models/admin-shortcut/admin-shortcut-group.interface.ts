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
   * Property id
   * @readonly
   *
   * @description
   * Stable key of the group, used to place it in a tab of the help dialog.
   *
   * @type {'general' | 'projects' | 'article' | 'messages'}
   */
  readonly id: 'general' | 'projects' | 'article' | 'messages';

  /**
   * Property label
   * @readonly
   *
   * @description
   * Localized heading of the group.
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
