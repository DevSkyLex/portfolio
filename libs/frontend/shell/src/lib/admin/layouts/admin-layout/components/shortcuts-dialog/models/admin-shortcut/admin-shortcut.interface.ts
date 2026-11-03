/**
 * Interface AdminShortcut
 * @interface AdminShortcut
 *
 * @description
 * Keyboard shortcut listed by the administration's help dialog (D36).
 */
export interface AdminShortcut {
  // #region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * French description of what the shortcut does (D18).
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property combos
   * @readonly
   *
   * @description
   * Equivalent key combinations, each one a list of keys pressed together (`['Ctrl', 'K']`).
   *
   * @type {readonly (readonly string[])[]}
   */
  readonly combos: readonly (readonly string[])[];

  /**
   * Property spoken
   * @readonly
   *
   * @description
   * Text read by screen readers instead of the key caps, which spell glyphs such as ⌘.
   *
   * @type {string}
   */
  readonly spoken: string;
  // #endregion
}
