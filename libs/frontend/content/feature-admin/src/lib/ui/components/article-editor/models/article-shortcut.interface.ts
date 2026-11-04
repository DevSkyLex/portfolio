/**
 * Interface ArticleShortcut
 * @interface ArticleShortcut
 *
 * @description
 * One editor shortcut resolved for the running platform: the key caps of its tooltip and the value of
 * its trigger's `aria-keyshortcuts`.
 */
export interface ArticleShortcut {
  // #region Properties
  /**
   * Property caps
   * @readonly
   *
   * @description
   * Keys shown in the tooltip, one cap each: `['⌘', 'B']` on Apple platforms, `['Ctrl', 'B']` elsewhere.
   *
   * @type {readonly string[]}
   */
  readonly caps: readonly string[];

  /**
   * Property aria
   * @readonly
   *
   * @description
   * The same combination in `aria-keyshortcuts` syntax: `Meta+B` on Apple platforms, `Control+B`
   * elsewhere.
   *
   * @type {string}
   */
  readonly aria: string;
  // #endregion
}
