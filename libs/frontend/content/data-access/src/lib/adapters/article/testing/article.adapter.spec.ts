import type { ArticleParagraphDto, PublicArticleDocumentDto } from '@vfortin/content-contracts';
import type { ProjectArticle } from '@vfortin/content-web-model';
import { toArticle } from '@internal/content-web-data-access/lib/adapters/article/article.adapter';

/**
 * Function text
 *
 * @description
 * Builds a paragraph made of one plain text node.
 */
const text = (value: string): ArticleParagraphDto => ({
  type: 'paragraph',
  content: [{ type: 'text', text: value }],
});

/**
 * Function h2
 *
 * @description
 * Builds a level-2 heading.
 */
const h2 = (value: string): PublicArticleDocumentDto['content'][number] => ({
  type: 'heading',
  attrs: { level: 2 },
  content: [{ type: 'text', text: value }],
});

describe('toArticle', (): void => {
  it('puts the blocks before the first level-2 heading in the introduction', (): void => {
    const article: Pick<ProjectArticle, 'intro' | 'sections'> = toArticle({
      type: 'doc',
      content: [text('Intro.'), h2('Contexte'), text('Contexte.'), h2('Ce que j’ai fait')],
    });
    expect(article).toEqual({
      intro: [{ kind: 'paragraph', content: [{ kind: 'text', text: 'Intro.' }] }],
      sections: [
        {
          id: 'contexte',
          label: 'Contexte',
          blocks: [{ kind: 'paragraph', content: [{ kind: 'text', text: 'Contexte.' }] }],
        },
        { id: 'ce-que-j-ai-fait', label: 'Ce que j’ai fait', blocks: [] },
      ],
    });
  });

  it('labels a section with the plain text of its heading and keeps the ids unique', (): void => {
    const article: Pick<ProjectArticle, 'intro' | 'sections'> = toArticle({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [
            { type: 'text', text: 'Choix ', marks: [{ type: 'bold' }] },
            { type: 'hardBreak' },
            { type: 'text', text: ' techniques' },
          ],
        },
        h2('Choix techniques'),
        { type: 'heading', attrs: { level: 2 } },
      ],
    });
    expect(article.intro).toEqual([]);
    expect(
      article.sections.map((section: ProjectArticle['sections'][number]): string[] => [
        section.id,
        section.label,
      ]),
    ).toEqual([
      ['choix-techniques', 'Choix techniques'],
      ['choix-techniques-2', 'Choix techniques'],
      ['section-3', ''],
    ]);
  });

  it('nests the marks, grouping the neighbouring text that shares one', (): void => {
    const { intro } = toArticle({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Voir ' },
            {
              type: 'text',
              text: 'la doc',
              marks: [{ type: 'bold' }, { type: 'link', attrs: { href: 'https://angular.dev' } }],
            },
            {
              type: 'text',
              text: ' en ligne',
              marks: [{ type: 'link', attrs: { href: 'https://angular.dev' } }],
            },
            { type: 'hardBreak' },
            {
              type: 'text',
              text: 'écrire',
              marks: [
                { type: 'code' },
                { type: 'italic' },
                { type: 'link', attrs: { href: 'mailto:hello@example.com' } },
                { type: 'italic' },
              ],
            },
          ],
        },
      ],
    });
    expect(intro).toEqual([
      {
        kind: 'paragraph',
        content: [
          { kind: 'text', text: 'Voir ' },
          {
            kind: 'link',
            href: 'https://angular.dev',
            external: true,
            content: [
              { kind: 'bold', content: [{ kind: 'text', text: 'la doc' }] },
              { kind: 'text', text: ' en ligne' },
            ],
          },
          { kind: 'break' },
          {
            kind: 'link',
            href: 'mailto:hello@example.com',
            external: false,
            content: [
              {
                kind: 'italic',
                content: [{ kind: 'code', content: [{ kind: 'text', text: 'écrire' }] }],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('keeps two links to different targets apart', (): void => {
    const { intro } = toArticle({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'a', marks: [{ type: 'link', attrs: { href: 'https://a.fr' } }] },
            { type: 'text', text: 'b', marks: [{ type: 'link', attrs: { href: 'https://b.fr' } }] },
            { type: 'text', text: 'c', marks: [{ type: 'bold' }] },
            { type: 'text', text: 'd', marks: [{ type: 'italic' }] },
          ],
        },
      ],
    });
    expect(intro[0]).toEqual({
      kind: 'paragraph',
      content: [
        {
          kind: 'link',
          href: 'https://a.fr',
          external: true,
          content: [{ kind: 'text', text: 'a' }],
        },
        {
          kind: 'link',
          href: 'https://b.fr',
          external: true,
          content: [{ kind: 'text', text: 'b' }],
        },
        { kind: 'bold', content: [{ kind: 'text', text: 'c' }] },
        { kind: 'italic', content: [{ kind: 'text', text: 'd' }] },
      ],
    });
  });

  it('maps every other block, nested lists included, and drops the empty ones', (): void => {
    const { intro } = toArticle({
      type: 'doc',
      content: [
        { type: 'paragraph' },
        { type: 'paragraph', content: [] },
        { type: 'heading', attrs: { level: 3 } },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Sous-titre' }] },
        {
          type: 'orderedList',
          attrs: { start: 3 },
          content: [
            {
              type: 'listItem',
              content: [
                text('Un'),
                {
                  type: 'bulletList',
                  content: [
                    {
                      type: 'listItem',
                      content: [
                        text('Deux'),
                        {
                          type: 'orderedList',
                          content: [{ type: 'listItem', content: [text('Trois')] }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'blockquote',
          content: [
            text('Cité.'),
            {
              type: 'bulletList',
              content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
            },
          ],
        },
        {
          type: 'codeBlock',
          content: [
            { type: 'text', text: 'const a = 1;\n' },
            { type: 'text', text: 'a++;' },
          ],
        },
        { type: 'codeBlock' },
        { type: 'horizontalRule' },
        {
          type: 'figure',
          attrs: {
            src: '/media/3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90.webp',
            small: null,
            width: 800,
            height: 600,
            alt: 'Écran',
            caption: '',
          },
        },
      ],
    });
    expect(intro).toEqual([
      { kind: 'subheading', content: [{ kind: 'text', text: 'Sous-titre' }] },
      {
        kind: 'list',
        ordered: true,
        start: 3,
        items: [
          [
            { kind: 'paragraph', content: [{ kind: 'text', text: 'Un' }] },
            {
              kind: 'list',
              ordered: false,
              start: 1,
              items: [
                [
                  { kind: 'paragraph', content: [{ kind: 'text', text: 'Deux' }] },
                  {
                    kind: 'list',
                    ordered: true,
                    start: 1,
                    items: [[{ kind: 'paragraph', content: [{ kind: 'text', text: 'Trois' }] }]],
                  },
                ],
              ],
            },
          ],
        ],
      },
      {
        kind: 'blockquote',
        blocks: [
          { kind: 'paragraph', content: [{ kind: 'text', text: 'Cité.' }] },
          { kind: 'list', ordered: false, start: 1, items: [[{ kind: 'paragraph', content: [] }]] },
        ],
      },
      { kind: 'code', text: 'const a = 1;\na++;', language: null, tokens: [] },
      { kind: 'code', text: '', language: null, tokens: [] },
      { kind: 'rule' },
      {
        kind: 'figure',
        image: {
          src: '/media/3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90.webp',
          small: null,
          width: 800,
          height: 600,
          alt: 'Écran',
        },
        caption: '',
      },
    ]);
  });

  it('names the language of a code block and keeps its highlighted runs', (): void => {
    const { intro } = toArticle({
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          attrs: { language: 'csharp' },
          content: [{ type: 'text', text: 'var a = 1;' }],
          tokens: [
            { text: 'var', kind: 'keyword' },
            { text: ' a = ', kind: null },
            { text: '1', kind: 'number' },
            { text: ';', kind: null },
          ],
        },
        {
          type: 'codeBlock',
          attrs: { language: null },
          content: [{ type: 'text', text: 'npm test' }],
        },
        {
          type: 'codeBlock',
          attrs: { language: 'bash' },
          content: [{ type: 'text', text: 'ls' }],
        },
      ],
    });
    expect(intro).toEqual([
      {
        kind: 'code',
        text: 'var a = 1;',
        language: 'C#',
        tokens: [
          { text: 'var', kind: 'keyword' },
          { text: ' a = ', kind: null },
          { text: '1', kind: 'number' },
          { text: ';', kind: null },
        ],
      },
      { kind: 'code', text: 'npm test', language: null, tokens: [] },
      { kind: 'code', text: 'ls', language: 'Bash', tokens: [] },
    ]);
  });
});
