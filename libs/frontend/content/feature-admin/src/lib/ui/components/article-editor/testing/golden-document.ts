import type { ChainedCommands, Editor } from '@tiptap/core';

/**
 * Constant GOLDEN_MEDIA
 *
 * @description
 * Media referenced by the figure of the golden document.
 */
export const GOLDEN_MEDIA: { readonly id: string; readonly src: string } = {
  id: '3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90',
  src: '/media/3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90.webp',
};

/**
 * Function buildGoldenDocument
 *
 * @description
 * Writes, through editor commands only, a document holding every node and mark the article contract
 * accepts (D40): both heading levels, the four marks, a hard break, a bullet list nested three levels
 * deep, an ordered list, a quote, a TypeScript code block, a rule and a figure. Its `getJSON()` is the golden
 * fixture `libs/contracts/content/src/lib/testing/article-document.golden.json`, so a TipTap upgrade
 * that changes the JSON fails the editor and contract tests.
 *
 * @param {Editor} editor - Empty article editor.
 */
export function buildGoldenDocument(editor: Editor): void {
  // Plain text: no mark is inherited from the text before the cursor.
  const text = (value: string): void => {
    editor
      .chain()
      .command(({ tr }): boolean => {
        tr.setStoredMarks([]);
        return true;
      })
      .insertContent({ type: 'text', text: value })
      .run();
  };
  const marked = (value: string, apply: (chain: ChainedCommands) => ChainedCommands): void => {
    const from: number = editor.state.selection.from;
    text(value);
    apply(editor.chain().setTextSelection({ from, to: from + value.length }))
      .setTextSelection(from + value.length)
      .run();
  };
  const next = (): void => {
    const end: number = editor.state.doc.content.size;
    editor
      .chain()
      .insertContentAt(end, { type: 'paragraph' })
      .setTextSelection(end + 1)
      .run();
  };

  editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph' }] });
  editor.commands.setTextSelection(1);
  text('Contexte');
  editor.commands.setHeading({ level: 2 });

  next();
  text('Un texte ');
  marked('gras', (chain: ChainedCommands): ChainedCommands => chain.toggleBold());
  text(', ');
  marked('italique', (chain: ChainedCommands): ChainedCommands => chain.toggleItalic());
  text(', du ');
  marked('code', (chain: ChainedCommands): ChainedCommands => chain.toggleCode());
  text(' et un ');
  marked('lien', (chain: ChainedCommands): ChainedCommands =>
    chain.setLink({ href: 'https://example.com/projet' }),
  );
  text('.');
  editor.commands.setHardBreak();
  text('Écrire à ');
  marked('l’auteur', (chain: ChainedCommands): ChainedCommands =>
    chain.setLink({ href: 'mailto:contact@example.com' }).toggleBold(),
  );
  text('.');

  next();
  text('Détails');
  editor.commands.setHeading({ level: 3 });

  next();
  editor.commands.toggleBulletList();
  text('Premier point');
  editor.commands.splitListItem('listItem');
  text('Sous-point');
  editor.commands.sinkListItem('listItem');
  editor.commands.splitListItem('listItem');
  text('Troisième niveau');
  editor.commands.sinkListItem('listItem');

  next();
  editor.commands.toggleOrderedList();
  text('Un');
  editor.commands.splitListItem('listItem');
  text('Deux');

  next();
  text('Une citation.');
  editor.commands.toggleBlockquote();

  next();
  text('const answer = 42;');
  editor.commands.toggleCodeBlock();
  editor.commands.updateAttributes('codeBlock', { language: 'typescript' });

  next();
  editor.commands.setHorizontalRule();

  const end: number = editor.state.doc.content.size;
  editor
    .chain()
    .insertContentAt(end, {
      type: 'figure',
      attrs: { media: GOLDEN_MEDIA.id, alt: '', caption: '', src: GOLDEN_MEDIA.src },
    })
    .setNodeSelection(end)
    .updateAttributes('figure', { alt: 'Écran d’accueil', caption: 'L’accueil du projet.' })
    .run();
}
