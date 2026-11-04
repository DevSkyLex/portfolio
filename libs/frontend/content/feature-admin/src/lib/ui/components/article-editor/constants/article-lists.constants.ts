import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { ARTICLE_TYPOGRAPHY } from '@vfortin/content-web-ui';

/**
 * Constant MAX_LIST_DEPTH
 *
 * @description
 * Deepest list nesting the article contract accepts (D40).
 */
const MAX_LIST_DEPTH: number = 3;

/**
 * Function isList
 *
 * @description
 * Whether a node is a bullet or ordered list.
 *
 * @param {ProseMirrorNode} node - Node inspected.
 *
 * @returns {boolean} `true` for a list.
 */
function isList(node: ProseMirrorNode): boolean {
  return node.type.name === 'bulletList' || node.type.name === 'orderedList';
}

/**
 * Function listDepth
 *
 * @description
 * Deepest list nesting below a node, text blocks excluded from the walk.
 *
 * @param {ProseMirrorNode} node - Node inspected.
 * @param {number} depth - Lists enclosing the node.
 *
 * @returns {number} Number of nested lists on the deepest branch.
 */
function listDepth(node: ProseMirrorNode, depth: number): number {
  const own: number = isList(node) ? depth + 1 : depth;
  if (node.isTextblock || node.isAtom) return own;
  let deepest: number = own;
  node.forEach((child: ProseMirrorNode): void => {
    deepest = Math.max(deepest, listDepth(child, own));
  });
  return deepest;
}

/**
 * Function listDecorations
 *
 * @description
 * Gives list items the class of their list kind and nested lists their spacing, as the public renderer
 * does: the same `listItem` node is drawn differently in a bullet and an ordered list.
 *
 * @param {ProseMirrorNode} doc - Document decorated.
 *
 * @returns {DecorationSet} Node decorations of every list item and nested list.
 */
function listDecorations(doc: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node: ProseMirrorNode, pos: number, parent: ProseMirrorNode | null): boolean => {
    if (node.isTextblock) return false;
    const end: number = pos + node.nodeSize;
    if (node.type.name === 'listItem' && parent) {
      decorations.push(
        Decoration.node(pos, end, {
          class:
            parent.type.name === 'orderedList'
              ? ARTICLE_TYPOGRAPHY.orderedItem
              : ARTICLE_TYPOGRAPHY.bulletItem,
        }),
      );
    } else if (isList(node) && parent?.type.name === 'listItem') {
      decorations.push(Decoration.node(pos, end, { class: ARTICLE_TYPOGRAPHY.nestedList }));
    }
    return true;
  });
  return DecorationSet.create(doc, decorations);
}

/**
 * Constant ArticleLists
 *
 * @description
 * List behaviour of the article editor: refuses any change nesting lists deeper than the contract
 * allows (Tab in a third-level item, a pasted deeper list) and draws items with the public classes.
 */
export const ArticleLists: Extension = Extension.create({
  name: 'articleLists',

  addProseMirrorPlugins() {
    const key: PluginKey<DecorationSet> = new PluginKey<DecorationSet>('articleLists');
    return [
      new Plugin<DecorationSet>({
        key,
        filterTransaction: (tr: Transaction): boolean =>
          !tr.docChanged || listDepth(tr.doc, 0) <= MAX_LIST_DEPTH,
        state: {
          init: (_: unknown, state: EditorState): DecorationSet => listDecorations(state.doc),
          apply: (tr: Transaction, set: DecorationSet): DecorationSet =>
            tr.docChanged ? listDecorations(tr.doc) : set,
        },
        props: {
          decorations: (state: EditorState): DecorationSet | undefined => key.getState(state),
        },
      }),
    ];
  },
});
