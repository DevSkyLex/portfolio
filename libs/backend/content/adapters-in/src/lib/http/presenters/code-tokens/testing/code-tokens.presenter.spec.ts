import {
  CODE_BLOCK_LANGUAGES,
  type CodeTokenDto,
  PublicArticleDocumentSchema,
  type PublicCodeBlockDto,
} from '@vfortin/content-contracts';
import { type ArticleCodeBlock, CODE_LANGUAGES, type CodeLanguage } from '@vfortin/content-domain';
import {
  toCodeTokens,
  toPublicCodeBlock,
} from '@internal/content-adapters-in/lib/http/presenters/code-tokens/code-tokens.presenter';

/**
 * Constant TYPESCRIPT
 *
 * @description
 * TypeScript sample with a comment, keywords, a function, parameters, types, a number, a template
 * string with an interpolation and a literal.
 */
const TYPESCRIPT: string = [
  '// Greets',
  'export async function greet(name: string): Promise<void> {',
  '  const n = 42;',
  '  console.log(`Hi ${name}`, n, true);',
  '}',
].join('\n');

/**
 * Constant BASH
 *
 * @description
 * Bash sample with a shebang, a comment, a variable nested in a string, a built-in and a keyword.
 */
const BASH: string = '#!/usr/bin/env bash\n# Build\nnpm run build --prefix "$APP_DIR" && echo done';

/**
 * Constant SAMPLES
 *
 * @description
 * One short snippet per listed language.
 */
const SAMPLES: Readonly<Record<CodeLanguage, string>> = {
  typescript: 'const a: number = 1;',
  javascript: 'export const a = () => 1;',
  html: '<p class="lead">Texte</p>',
  xml: '<?xml version="1.0"?><note id="1"/>',
  css: '.card { color: red; }',
  scss: '$gap: 4px; .card { margin: $gap; }',
  json: '{ "name": "site", "private": true }',
  bash: 'echo "$HOME"',
  python: 'def add(a, b):\n    return a + b',
  php: '<?php echo $name; ?>',
  sql: 'SELECT id FROM projects WHERE slug = $1;',
  yaml: 'services:\n  web:\n    image: nginx',
  markdown: '# Titre\n\n- point',
  java: 'public final class App {}',
  csharp: 'public record Point(int X, int Y);',
  go: 'func main() { fmt.Println("ok") }',
  rust: 'fn main() { println!("ok"); }',
  dockerfile: 'FROM node:24\nRUN npm ci',
  nginx: 'server { listen 80; }',
  mermaid: 'flowchart LR\n  A --> B',
};

/**
 * Function spell
 *
 * @description
 * Joins the texts of runs.
 */
function spell(tokens: readonly CodeTokenDto[] | undefined): string | undefined {
  return tokens?.map((token: CodeTokenDto): string => token.text).join('');
}

describe('toCodeTokens', (): void => {
  it('folds the TypeScript scopes into kinds, with plain text between them', (): void => {
    expect(toCodeTokens(TYPESCRIPT, 'typescript')).toEqual([
      { text: '// Greets', kind: 'comment' },
      { text: '\n', kind: null },
      { text: 'export', kind: 'keyword' },
      { text: ' ', kind: null },
      { text: 'async', kind: 'keyword' },
      { text: ' ', kind: null },
      { text: 'function', kind: 'keyword' },
      { text: ' ', kind: null },
      { text: 'greet', kind: 'function' },
      { text: '(', kind: null },
      { text: 'name', kind: 'attribute' },
      { text: ': ', kind: null },
      { text: 'string', kind: 'type' },
      { text: '): ', kind: null },
      { text: 'Promise', kind: 'type' },
      { text: '<', kind: null },
      { text: 'void', kind: 'type' },
      { text: '> {\n  ', kind: null },
      { text: 'const', kind: 'keyword' },
      { text: ' n = ', kind: null },
      { text: '42', kind: 'number' },
      { text: ';\n  ', kind: null },
      { text: 'console', kind: 'keyword' },
      { text: '.', kind: null },
      { text: 'log', kind: 'function' },
      { text: '(', kind: null },
      { text: '`Hi ', kind: 'string' },
      { text: '${name}', kind: null },
      { text: '`', kind: 'string' },
      { text: ', n, ', kind: null },
      { text: 'true', kind: 'literal' },
      { text: ');\n}', kind: null },
    ]);
  });

  it('flattens the scopes nested in bash strings and keeps the inner kind', (): void => {
    expect(toCodeTokens(BASH, 'bash')).toEqual([
      { text: '#!/usr/bin/env bash', kind: 'meta' },
      { text: '\n', kind: null },
      { text: '# Build', kind: 'comment' },
      { text: '\nnpm run build --prefix ', kind: null },
      { text: '"', kind: 'string' },
      { text: '$APP_DIR', kind: 'variable' },
      { text: '"', kind: 'string' },
      { text: ' && ', kind: null },
      { text: 'echo', kind: 'type' },
      { text: ' ', kind: null },
      { text: 'done', kind: 'keyword' },
    ]);
  });

  it('reads HTML with the XML grammar: brackets, tag names, attributes and values', (): void => {
    expect(toCodeTokens('<a href="/x">Lien</a>', 'html')).toEqual([
      { text: '<', kind: 'punctuation' },
      { text: 'a', kind: 'tag' },
      { text: ' ', kind: 'punctuation' },
      { text: 'href', kind: 'attribute' },
      { text: '=', kind: 'punctuation' },
      { text: '"/x"', kind: 'string' },
      { text: '>', kind: 'punctuation' },
      { text: 'Lien', kind: null },
      { text: '</', kind: 'punctuation' },
      { text: 'a', kind: 'tag' },
      { text: '>', kind: 'punctuation' },
    ]);
  });

  it('highlights a language embedded in another with its own scopes', (): void => {
    const tokens: CodeTokenDto[] | undefined = toCodeTokens(
      '<style>p { color: red; }</style>',
      'html',
    );
    expect(spell(tokens)).toBe('<style>p { color: red; }</style>');
    expect(tokens).toContainEqual({ text: 'p', kind: 'tag' });
    expect(tokens).toContainEqual({ text: 'color', kind: 'attribute' });
  });

  it('leaves plain text and empty code without runs', (): void => {
    expect(toCodeTokens('npm test', null)).toBeUndefined();
    expect(toCodeTokens('', 'bash')).toBeUndefined();
  });

  it.each(CODE_LANGUAGES.filter((language: CodeLanguage): boolean => language !== 'mermaid'))(
    'highlights %s into runs spelling the code',
    (language: CodeLanguage): void => {
      const tokens: CodeTokenDto[] | undefined = toCodeTokens(SAMPLES[language], language);
      expect(spell(tokens)).toBe(SAMPLES[language]);
      expect(tokens?.some((token: CodeTokenDto): boolean => token.kind !== null)).toBe(true);
      for (const [index, token] of (tokens ?? []).entries()) {
        expect(token.text).not.toBe('');
        expect(token.kind).not.toBe(tokens?.[index + 1]?.kind);
      }
    },
  );

  it('lists the same languages as the content contracts', (): void => {
    expect([...CODE_LANGUAGES].sort()).toEqual(Object.keys(CODE_BLOCK_LANGUAGES).sort());
  });
});

describe('toPublicCodeBlock', (): void => {
  it('publishes Mermaid source without highlight tokens', (): void => {
    const block: ArticleCodeBlock = {
      type: 'codeBlock',
      attrs: { language: 'mermaid' },
      content: [{ type: 'text', text: SAMPLES.mermaid }],
    };
    expect(toPublicCodeBlock(block)).toEqual(block);
    expect(PublicArticleDocumentSchema.safeParse({ type: 'doc', content: [block] }).success).toBe(
      true,
    );
  });

  it('publishes the language, the text and the runs of a highlighted block', (): void => {
    const block: PublicCodeBlockDto = toPublicCodeBlock({
      type: 'codeBlock',
      attrs: { language: 'bash' },
      content: [{ type: 'text', text: 'echo ok' }],
    });
    expect(block).toEqual({
      type: 'codeBlock',
      attrs: { language: 'bash' },
      content: [{ type: 'text', text: 'echo ok' }],
      tokens: [
        { text: 'echo', kind: 'type' },
        { text: ' ok', kind: null },
      ],
    });
    expect(PublicArticleDocumentSchema.safeParse({ type: 'doc', content: [block] }).success).toBe(
      true,
    );
  });

  it('publishes plain text and empty blocks without runs', (): void => {
    expect(
      toPublicCodeBlock({
        type: 'codeBlock',
        attrs: { language: null },
        content: [{ type: 'text', text: 'npm test' }],
      }),
    ).toEqual({
      type: 'codeBlock',
      attrs: { language: null },
      content: [{ type: 'text', text: 'npm test' }],
    });
    expect(toPublicCodeBlock({ type: 'codeBlock', attrs: { language: 'typescript' } })).toEqual({
      type: 'codeBlock',
      attrs: { language: 'typescript' },
    });
  });
});
