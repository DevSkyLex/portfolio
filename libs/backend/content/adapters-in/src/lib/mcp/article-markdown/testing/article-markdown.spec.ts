import { EditableArticleDocumentSchema } from '@vfortin/content-contracts';
import { z } from 'zod/mini';
import {
  ArticleMarkdownError,
  type DocNode,
  articleToMarkdown,
  exactMarkdown,
  markdownToArticle,
} from '@internal/content-adapters-in/lib/mcp/article-markdown/article-markdown';

const MEDIA: string = '0b7c1d2e-3f40-4a51-8b62-7c83d94e0a15';

/**
 * Constant FULL
 *
 * @description
 * One document using every construct of the editor, with text that needs escaping.
 */
const FULL: DocNode & { readonly content: readonly DocNode[] } = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Context' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Plain, ' },
        { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' and ' },
        { type: 'text', text: 'bold italic', marks: [{ type: 'bold' }, { type: 'italic' }] },
        { type: 'text', text: ', ' },
        { type: 'text', text: 'config.ts', marks: [{ type: 'code' }] },
        { type: 'text', text: ', a ' },
        {
          type: 'text',
          text: 'link',
          marks: [{ type: 'link', attrs: { href: 'https://example.com/a_b?x=(1)' } }],
        },
        { type: 'text', text: ' and literal *stars*, _under_, [brackets], <tag>, `tick` & &amp;.' },
        { type: 'hardBreak' },
        { type: 'text', text: '# not a heading, 1. not a list' },
      ],
    },
    { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Details' }] },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
            {
              type: 'orderedList',
              attrs: { start: 3 },
              content: [
                {
                  type: 'listItem',
                  content: [
                    { type: 'paragraph', content: [{ type: 'text', text: 'Third' }] },
                    {
                      type: 'bulletList',
                      content: [
                        {
                          type: 'listItem',
                          content: [
                            { type: 'paragraph', content: [{ type: 'text', text: 'Deep' }] },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'listItem',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Fourth' }] }],
                },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second item' }] }],
        },
      ],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Next list' }] }],
        },
      ],
    },
    {
      type: 'blockquote',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Quoted' }] },
        {
          type: 'orderedList',
          attrs: { start: 1 },
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One' }] }],
            },
          ],
        },
      ],
    },
    {
      type: 'codeBlock',
      attrs: { language: 'typescript' },
      content: [{ type: 'text', text: 'const a = `x`;\n```\nconst b = 2;' }],
    },
    { type: 'codeBlock', attrs: { language: null }, content: [{ type: 'text', text: 'plain' }] },
    { type: 'horizontalRule' },
    { type: 'figure', attrs: { media: MEDIA, alt: 'A [screen]', caption: 'The "home" page' } },
    { type: 'figure', attrs: { media: MEDIA, alt: '', caption: '' } },
    { type: 'paragraph' },
  ],
};

describe('articleToMarkdown', (): void => {
  it('writes every editor construct in the documented dialect', (): void => {
    const markdown: string = articleToMarkdown(FULL);
    expect(markdown).toContain('## Context');
    expect(markdown).toContain('### Details');
    expect(markdown).toContain('**bold**');
    expect(markdown).toContain('***bold italic***');
    expect(markdown).toContain('`config.ts`');
    expect(markdown).toContain('[link](<https://example.com/a_b?x=(1)>)');
    expect(markdown).toContain('\\*stars\\*');
    expect(markdown).toContain('\\# not a heading, 1. not a list');
    expect(markdown).toContain('  3. Third');
    expect(markdown).toContain('```typescript');
    expect(markdown).toContain('````');
    expect(markdown).toContain('---');
    expect(markdown).toContain(`![A \\[screen\\]](media:${MEDIA} "The \\"home\\" page")`);
    expect(markdown).toContain(`![](media:${MEDIA})`);
  });
});

describe('exactMarkdown', (): void => {
  it('reads its own Markdown back to the same document, empty paragraphs aside', (): void => {
    const markdown: string | null = exactMarkdown(FULL);
    expect(markdown).not.toBeNull();
    const back: DocNode = markdownToArticle(markdown as string);
    expect(back.content).toHaveLength(FULL.content.length - 1);
    expect(z.safeParse(EditableArticleDocumentSchema, back).success).toBe(true);
  });

  it('refuses Markdown it cannot write exactly', (): void => {
    expect(
      exactMarkdown({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [
              { type: 'text', text: 'a' },
              { type: 'hardBreak' },
              { type: 'text', text: 'b' },
            ],
          },
        ],
      }),
    ).toBeNull();
  });
});

describe('markdownToArticle', (): void => {
  it('builds the editor document of a typical AI text', (): void => {
    expect(
      markdownToArticle(
        `## Goal\n\nShip a **fast** site with [Angular](https://angular.dev).\nSame paragraph.\n\n- one\n- two\n\n1. first\n2. second\n\n\`\`\`ts\nlet x = 1;\n\`\`\`\n\n![Home](media:${MEDIA.toUpperCase()} "Home page")\n`,
      ),
    ).toEqual({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Goal' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Ship a ' },
            { type: 'text', text: 'fast', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' site with ' },
            {
              type: 'text',
              text: 'Angular',
              marks: [{ type: 'link', attrs: { href: 'https://angular.dev' } }],
            },
            { type: 'text', text: '. Same paragraph.' },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }],
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'two' }] }],
            },
          ],
        },
        {
          type: 'orderedList',
          attrs: { start: 1 },
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'first' }] }],
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'second' }] }],
            },
          ],
        },
        {
          type: 'codeBlock',
          attrs: { language: 'ts' },
          content: [{ type: 'text', text: 'let x = 1;' }],
        },
        { type: 'figure', attrs: { media: MEDIA, alt: 'Home', caption: 'Home page' } },
      ],
    });
  });

  it('names the line of what the editor cannot hold', (): void => {
    const failure = (markdown: string): string => {
      try {
        markdownToArticle(markdown);
        return 'no error';
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ArticleMarkdownError);
        return (error as Error).message;
      }
    };
    expect(failure('text\n\n# Title')).toBe(
      'Headings are "## " (level 2) or "### " (level 3) (line 3)',
    );
    expect(failure('![x](https://cdn.example/x.png)')).toContain('Images come from upload_media');
    expect(failure('see ![x](media:00000000-0000-4000-8000-000000000000) here')).toContain(
      'An image must be alone in its paragraph',
    );
    expect(failure('- one\n\n  two')).toBe(
      'A list item holds one paragraph, optionally followed by nested lists (line 1)',
    );
    expect(failure('text\n\n**`code`**')).toBe(
      'Inline code cannot also be bold, italic or a link in the editor (line 3)',
    );
  });

  it('keeps raw HTML as text and never returns an empty document', (): void => {
    expect(markdownToArticle('<b>x</b>')).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '<b>x</b>' }] }],
    });
    expect(markdownToArticle('')).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
  });

  it('reads edge syntax: empty heading, indented and empty code, empty link, split lists', (): void => {
    expect(
      markdownToArticle('##\n\n    indented\n\n```\n```\n\n[vide]()\n\n1. a\n\n1) b\n\n> q\n'),
    ).toEqual({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 } },
        {
          type: 'codeBlock',
          attrs: { language: null },
          content: [{ type: 'text', text: 'indented' }],
        },
        { type: 'codeBlock', attrs: { language: null } },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'vide', marks: [{ type: 'link', attrs: { href: '' } }] }],
        },
        {
          type: 'orderedList',
          attrs: { start: 1 },
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }],
            },
          ],
        },
        {
          type: 'orderedList',
          attrs: { start: 1 },
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'b' }] }],
            },
          ],
        },
        {
          type: 'blockquote',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'q' }] }],
        },
      ],
    });
    expect(() => markdownToArticle('![x]()')).toThrow('Images come from upload_media');
    expect(new ArticleMarkdownError('No line', null).message).toBe('No line');
  });
});

describe('articleToMarkdown with sparse nodes', (): void => {
  it('falls back on defaults, keeps edge spaces out of marks and separates consecutive lists', (): void => {
    const sparse: DocNode = {
      type: 'doc',
      content: [
        { type: 'heading' },
        { type: 'bulletList' },
        { type: 'orderedList', content: [{ type: 'listItem' }] },
        { type: 'blockquote' },
        { type: 'codeBlock' },
        { type: 'figure' },
        { type: 'unknownBlock' },
        {
          type: 'paragraph',
          content: [
            { type: 'text' },
            { type: 'text', text: '  ', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' gras ', marks: [{ type: 'bold' }] },
            { type: 'text', text: '`x ', marks: [{ type: 'code' }] },
            { type: 'text', text: 'lien', marks: [{ type: 'link' }] },
            {
              type: 'text',
              text: 'deux',
              marks: [{ type: 'link', attrs: { href: 'https://a.b/c d' } }],
            },
          ],
        },
        {
          type: 'orderedList',
          attrs: { start: 1 },
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }],
            },
          ],
        },
        {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'b' }] }],
            },
          ],
        },
      ],
    };
    expect(articleToMarkdown(sparse)).toBe(
      '## \n\n1. \n\n>\n\n```\n```\n\n![](media:)\n\n   **gras** `` `x `` [lien]()[deux](<https://a.b/c d>)\n\n1. a\n\n1) b\n',
    );
    // `media:` without id does not read back: the document is handed out as JSON.
    expect(exactMarkdown(sparse)).toBeNull();
    expect(articleToMarkdown({ type: 'doc' })).toBe('\n');
  });
});
