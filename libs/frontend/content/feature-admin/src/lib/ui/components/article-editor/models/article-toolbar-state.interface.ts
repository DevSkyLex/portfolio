import type { ArticleBlockType } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/article-block-type.type';
import type { CodeLanguage } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/code-language.type';

/**
 * Interface ArticleToolbarState
 * @interface ArticleToolbarState
 *
 * @description
 * State of the editor toolbar read from the editor after each transaction: what is active at the
 * selection and which commands can run there.
 */
export interface ArticleToolbarState {
  // #region Properties
  /**
   * Property block
   * @readonly
   *
   * @description
   * Text block kind at the selection, `null` in a code block or on a figure.
   *
   * @type {ArticleBlockType | null}
   */
  readonly block: ArticleBlockType | null;

  /**
   * Property active
   * @readonly
   *
   * @description
   * Marks and blocks active at the selection.
   *
   * @type {Readonly<Record<'bold' | 'italic' | 'code' | 'link' | 'bulletList' | 'orderedList' | 'blockquote' | 'codeBlock', boolean>>}
   */
  readonly active: Readonly<
    Record<
      | 'bold'
      | 'italic'
      | 'code'
      | 'link'
      | 'bulletList'
      | 'orderedList'
      | 'blockquote'
      | 'codeBlock',
      boolean
    >
  >;

  /**
   * Property can
   * @readonly
   *
   * @description
   * Commands that can run at the selection; the others are disabled.
   *
   * @type {Readonly<Record<'heading' | 'bold' | 'italic' | 'code' | 'link' | 'bulletList' | 'orderedList' | 'blockquote' | 'codeBlock' | 'horizontalRule' | 'undo' | 'redo', boolean>>}
   */
  readonly can: Readonly<
    Record<
      | 'heading'
      | 'bold'
      | 'italic'
      | 'code'
      | 'link'
      | 'bulletList'
      | 'orderedList'
      | 'blockquote'
      | 'codeBlock'
      | 'horizontalRule'
      | 'undo'
      | 'redo',
      boolean
    >
  >;

  /**
   * Property figure
   * @readonly
   *
   * @description
   * Position of the selected figure, `null` when no figure is selected.
   *
   * @type {number | null}
   */
  readonly figure: number | null;

  /**
   * Property codeLanguage
   * @readonly
   *
   * @description
   * Language of the code block holding the selection, `null` for plain text, an unlisted name or
   * outside a code block (`active.codeBlock` tells which).
   *
   * @type {CodeLanguage | null}
   */
  readonly codeLanguage: CodeLanguage | null;
  // #endregion
}
