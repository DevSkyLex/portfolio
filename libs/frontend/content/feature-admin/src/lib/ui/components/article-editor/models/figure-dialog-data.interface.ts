import type { FigureTexts } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/figure-texts.interface';

/**
 * Interface FigureDialogData
 * @interface FigureDialogData
 *
 * @description
 * Figure opened in the texts dialog: its current texts and the image shown beside them.
 */
export interface FigureDialogData extends FigureTexts {
  // #region Properties
  /**
   * Property src
   * @readonly
   *
   * @description
   * URL of the image, `null` when it cannot be displayed.
   *
   * @type {string | null}
   */
  readonly src: string | null;
  // #endregion
}
