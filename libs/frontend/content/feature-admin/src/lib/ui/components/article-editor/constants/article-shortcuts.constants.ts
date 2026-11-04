/**
 * Constant ARTICLE_SHORTCUTS
 *
 * @description
 * Keyboard shortcuts of the article toolbar, as TipTap binds them (`Mod-Alt-2`, `Mod-Shift-8`...):
 * `Mod` stands for the platform modifier (Command on Apple platforms, Control elsewhere) and `Maj` for
 * Shift, as `ModifierKeyService` names it; `resolveArticleShortcut` turns each into caps in the
 * admin's locale and `aria-keyshortcuts`.
 */
export const ARTICLE_SHORTCUTS = {
  paragraph: ['Mod', 'Alt', '0'],
  h2: ['Mod', 'Alt', '2'],
  h3: ['Mod', 'Alt', '3'],
  bold: ['Mod', 'B'],
  italic: ['Mod', 'I'],
  code: ['Mod', 'E'],
  bulletList: ['Mod', 'Maj', '8'],
  orderedList: ['Mod', 'Maj', '7'],
  blockquote: ['Mod', 'Maj', 'B'],
  codeBlock: ['Mod', 'Alt', 'C'],
  undo: ['Mod', 'Z'],
  redo: ['Mod', 'Maj', 'Z'],
} as const satisfies Readonly<Record<string, readonly string[]>>;
