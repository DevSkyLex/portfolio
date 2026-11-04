import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import type { ArticleBlockType } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/article-block-type.type';
import type { ArticleToolbarState } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/article-toolbar-state.interface';
import { isCodeLanguage } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/constants/article-lowlight.constants';

/**
 * Function blockOf
 *
 * @description
 * Text block kind at the selection.
 *
 * @param {Editor} editor - Editor read.
 *
 * @returns {ArticleBlockType | null} The kind, or `null` in a code block or on a figure.
 */
function blockOf(editor: Editor): ArticleBlockType | null {
  if (editor.isActive('heading', { level: 2 })) return 'h2';
  if (editor.isActive('heading', { level: 3 })) return 'h3';
  if (editor.isActive('codeBlock') || editor.isActive('figure')) return null;
  return editor.isActive('paragraph') ? 'paragraph' : null;
}

/**
 * Function readToolbar
 *
 * @description
 * Reads the toolbar state of an editor at its current selection.
 *
 * @param {Editor} editor - Editor read after a transaction.
 *
 * @returns {ArticleToolbarState} Active formats, available commands, the selected figure and the
 * language of the code block holding the selection.
 */
export function readToolbar(editor: Editor): ArticleToolbarState {
  const selection: unknown = editor.state.selection;
  const figure: number | null =
    selection instanceof NodeSelection && selection.node.type.name === 'figure'
      ? selection.from
      : null;
  const language: unknown = editor.isActive('codeBlock')
    ? editor.getAttributes('codeBlock')['language']
    : null;
  return {
    block: blockOf(editor),
    active: {
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      code: editor.isActive('code'),
      link: editor.isActive('link'),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      blockquote: editor.isActive('blockquote'),
      codeBlock: editor.isActive('codeBlock'),
    },
    can: {
      // Setting the level a heading already has is refused: either level counts.
      heading: editor.can().setHeading({ level: 2 }) || editor.can().setHeading({ level: 3 }),
      bold: editor.can().toggleBold(),
      italic: editor.can().toggleItalic(),
      code: editor.can().toggleCode(),
      link: figure === null && !editor.isActive('codeBlock'),
      bulletList: editor.can().toggleBulletList(),
      orderedList: editor.can().toggleOrderedList(),
      blockquote: editor.can().toggleBlockquote(),
      codeBlock: editor.can().toggleCodeBlock(),
      horizontalRule: editor.can().setHorizontalRule(),
      undo: editor.can().undo(),
      redo: editor.can().redo(),
    },
    figure,
    codeLanguage: isCodeLanguage(language) ? language : null,
  };
}
