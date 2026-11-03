/**
 * Interface ConfirmDialogOptions
 * @interface ConfirmDialogOptions
 *
 * @description
 * Content of a confirmation asked before an action, opened with `ConfirmDialogService.confirm`.
 */
export interface ConfirmDialogOptions {
  // #region Properties
  /**
   * Property title
   *
   * @description
   * Question asked, ending with a question mark ("Supprimer ce message ?").
   *
   * @type {string}
   */
  readonly title: string;

  /**
   * Property description
   *
   * @description
   * Consequence of the action, when the title alone does not say it.
   *
   * @type {string | undefined}
   */
  readonly description?: string;

  /**
   * Property confirmLabel
   *
   * @description
   * Label of the confirming button: the action's verb ("Supprimer", "Dépublier").
   *
   * @type {string}
   */
  readonly confirmLabel: string;

  /**
   * Property cancelLabel
   *
   * @description
   * Label of the cancelling button; "Annuler" by default.
   *
   * @type {string | undefined}
   */
  readonly cancelLabel?: string;

  /**
   * Property tone
   *
   * @description
   * `danger` for a destructive or irreversible action (red confirming button), `default` otherwise.
   *
   * @type {'default' | 'danger' | undefined}
   */
  readonly tone?: 'default' | 'danger';
  // #endregion
}
