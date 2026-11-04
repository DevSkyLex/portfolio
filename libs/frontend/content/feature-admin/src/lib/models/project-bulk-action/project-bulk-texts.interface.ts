/**
 * Interface ProjectBulkTexts
 * @interface ProjectBulkTexts
 *
 * @description
 * Localized copy of one bulk action: its confirmation and the counts of the result toasts.
 */
export interface ProjectBulkTexts {
  // #region Properties
  /** Confirmation title from its subject (« Orbite » or "3 projets"). */
  readonly confirmTitle: (subject: string) => string;
  /** Confirmation body: what changes on the public site. */
  readonly confirmDescription: string;
  /** Confirmation button. */
  readonly confirmLabel: string;
  /** Danger tone for the action that takes projects off the public site. */
  readonly tone: 'default' | 'danger';
  /** Projects changed, with the participle agreeing with the count ("3 projets publiés"). */
  readonly done: (count: number) => string;
  /** Projects changed out of those attempted, after a partial failure ("1 projet dépublié sur 2"). */
  readonly partial: (count: number, total: number) => string;
  // #endregion
}
