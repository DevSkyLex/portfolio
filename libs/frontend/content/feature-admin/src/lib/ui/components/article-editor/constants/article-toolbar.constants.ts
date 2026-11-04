import type { ArticleToolbarState } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/article-toolbar-state.interface';

/**
 * Constant IDLE_TOOLBAR
 *
 * @description
 * Toolbar before the editor exists: nothing active, nothing available.
 */
export const IDLE_TOOLBAR: ArticleToolbarState = {
  block: null,
  active: {
    bold: false,
    italic: false,
    code: false,
    link: false,
    bulletList: false,
    orderedList: false,
    blockquote: false,
    codeBlock: false,
  },
  can: {
    heading: false,
    bold: false,
    italic: false,
    code: false,
    link: false,
    bulletList: false,
    orderedList: false,
    blockquote: false,
    codeBlock: false,
    horizontalRule: false,
    undo: false,
    redo: false,
  },
  figure: null,
  codeLanguage: null,
};
