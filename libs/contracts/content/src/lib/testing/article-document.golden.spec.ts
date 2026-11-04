import {
  type EditableArticleDocumentDto,
  EditableArticleDocumentSchema,
} from '@internal/content-contracts/lib/article-document.contract';
import golden from '@internal/content-contracts/lib/testing/article-document.golden.json';

/**
 * Golden fixture
 *
 * @description
 * `article-document.golden.json` is the `getJSON()` of the real administrator editor after commands
 * writing every node and mark (`content-web-feature-admin`, `article-editor/testing/golden-document.ts`);
 * the editor spec asserts that it still produces exactly this JSON.
 */
describe('EditableArticleDocumentSchema', (): void => {
  it('accepts the golden document written by the editor', (): void => {
    expect(EditableArticleDocumentSchema.safeParse(golden).error).toBeUndefined();
  });

  it('keeps every node, mark and code block language of the golden document, stripping the editor-only attributes', (): void => {
    const parsed: EditableArticleDocumentDto = EditableArticleDocumentSchema.parse(golden);
    expect(parsed.content.map((block): string => block.type)).toEqual([
      'heading',
      'paragraph',
      'heading',
      'bulletList',
      'orderedList',
      'blockquote',
      'codeBlock',
      'horizontalRule',
      'paragraph',
      'figure',
    ]);
    const marks: string[] = JSON.stringify(parsed).match(/"type":"(bold|italic|code|link)"/g) ?? [];
    expect(new Set(marks)).toEqual(
      new Set(['"type":"bold"', '"type":"italic"', '"type":"code"', '"type":"link"']),
    );
    expect(JSON.stringify(parsed)).toContain('"type":"hardBreak"');
    expect(parsed.content.at(-1)).toEqual({
      type: 'figure',
      attrs: {
        media: '3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90',
        alt: 'Écran d’accueil',
        caption: 'L’accueil du projet.',
      },
    });
    expect(parsed.content[6]).toEqual({
      type: 'codeBlock',
      attrs: { language: 'typescript' },
      content: [{ type: 'text', text: 'const answer = 42;' }],
    });
  });
});
