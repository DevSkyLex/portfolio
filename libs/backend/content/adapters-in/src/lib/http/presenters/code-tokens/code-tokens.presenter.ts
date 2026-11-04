import {
  CODE_BLOCK_LANGUAGES,
  type CodeLanguageDto,
  type CodeTokenDto,
  type CodeTokenKindDto,
  type PublicCodeBlockDto,
} from '@vfortin/content-contracts';
import type { ArticleCodeBlock } from '@vfortin/content-domain';
import bash from 'highlight.js/lib/languages/bash';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import nginx from 'highlight.js/lib/languages/nginx';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import scss from 'highlight.js/lib/languages/scss';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { createLowlight } from 'lowlight';

/**
 * Constant lowlight
 *
 * @description
 * Highlighter holding only the grammars named by `CODE_BLOCK_LANGUAGES`, keyed by those names; the
 * browser never loads one, the snapshot carries the runs (D40 code block revision).
 */
const lowlight: ReturnType<typeof createLowlight> = createLowlight({
  bash,
  csharp,
  css,
  dockerfile,
  go,
  java,
  javascript,
  json,
  markdown,
  nginx,
  php,
  python,
  rust,
  scss,
  sql,
  typescript,
  xml,
  yaml,
});

/**
 * Constant SCOPE_KINDS
 *
 * @description
 * Token kind of the highlight.js scopes, matched on the longest dotted prefix (`title.function.invoke`
 * reads `title.function`). `null` resets to plain text, so an interpolation (`subst`) inside a string
 * is not coloured as the string; a scope missing here (`params`, `emphasis`) keeps its parent's kind.
 * A `tag` is its brackets: its name and attributes have their own scopes.
 */
const SCOPE_KINDS: ReadonlyMap<string, CodeTokenKindDto | null> = new Map<
  string,
  CodeTokenKindDto | null
>([
  ['keyword', 'keyword'],
  ['doctag', 'keyword'],
  ['section', 'keyword'],
  ['template-tag', 'keyword'],
  ['variable.language', 'keyword'],
  ['string', 'string'],
  ['regexp', 'string'],
  ['char', 'string'],
  ['code', 'string'],
  ['link', 'string'],
  ['subst', null],
  ['number', 'number'],
  ['literal', 'literal'],
  ['symbol', 'literal'],
  ['variable.constant', 'literal'],
  ['comment', 'comment'],
  ['quote', 'comment'],
  ['title', 'function'],
  ['function', 'function'],
  ['title.class', 'type'],
  ['class', 'type'],
  ['type', 'type'],
  ['built_in', 'type'],
  ['variable', 'variable'],
  ['template-variable', 'variable'],
  ['property', 'property'],
  ['operator', 'operator'],
  ['punctuation', 'punctuation'],
  ['bullet', 'punctuation'],
  ['tag', 'punctuation'],
  ['name', 'tag'],
  ['selector-tag', 'tag'],
  ['attr', 'attribute'],
  ['attribute', 'attribute'],
  ['selector-id', 'attribute'],
  ['selector-class', 'attribute'],
  ['selector-attr', 'attribute'],
  ['selector-pseudo', 'attribute'],
  ['meta', 'meta'],
]);

/**
 * Constant SCOPE_PREFIX
 *
 * @description
 * Class prefix lowlight gives the first segment of a scope; a class without it names an embedded
 * language (the CSS of a `<style>` element).
 */
const SCOPE_PREFIX: string = 'hljs-';

/**
 * Interface HighlightNode
 * @interface HighlightNode
 *
 * @description
 * Structural view of the lowlight (hast) tree: text leaves and `span` elements whose classes encode a
 * scope (`hljs-title`, `function_` for `title.function`).
 */
interface HighlightNode {
  // #region Properties
  readonly type: string;
  readonly value?: string;
  readonly properties?: { readonly className?: unknown };
  readonly children?: readonly HighlightNode[];
  // #endregion
}

/**
 * Interface CodeRun
 * @interface CodeRun
 *
 * @description
 * Run being collected: mutable so that neighbouring text of one kind joins it.
 */
interface CodeRun {
  // #region Properties
  text: string;
  kind: CodeTokenKindDto | null;
  // #endregion
}

/**
 * Function scopeKind
 *
 * @description
 * Reads the kind of an element from its classes.
 *
 * @param {unknown} classNames - `className` of the element.
 * @returns {CodeTokenKindDto | null | undefined} Its kind, `null` for plain text, `undefined` to keep
 * the parent's kind.
 */
function scopeKind(classNames: unknown): CodeTokenKindDto | null | undefined {
  if (!Array.isArray(classNames) || typeof classNames[0] !== 'string') return undefined;
  const [first, ...rest] = classNames as string[];
  if (!first?.startsWith(SCOPE_PREFIX)) return null;
  const segments: string[] = [
    first.slice(SCOPE_PREFIX.length),
    ...rest.map((name: string): string => name.replace(/_+$/, '')),
  ];
  for (let length: number = segments.length; length > 0; length--) {
    const scope: string = segments.slice(0, length).join('.');
    if (SCOPE_KINDS.has(scope)) return SCOPE_KINDS.get(scope);
  }
  return undefined;
}

/**
 * Function collect
 *
 * @description
 * Flattens a highlighted tree into runs, the innermost scope with a kind deciding each text, and
 * joins neighbouring text of the same kind.
 *
 * @param {readonly HighlightNode[]} nodes - Children to walk.
 * @param {CodeTokenKindDto | null} kind - Kind inherited from the enclosing scopes.
 * @param {CodeRun[]} runs - Runs collected so far, extended in place.
 */
function collect(
  nodes: readonly HighlightNode[],
  kind: CodeTokenKindDto | null,
  runs: CodeRun[],
): void {
  for (const node of nodes) {
    if (node.type === 'text' && node.value) {
      const last: CodeRun | undefined = runs.at(-1);
      if (last?.kind === kind) last.text += node.value;
      else runs.push({ text: node.value, kind });
    } else if (node.type === 'element') {
      const own: CodeTokenKindDto | null | undefined = scopeKind(node.properties?.className);
      collect(node.children ?? [], own === undefined ? kind : own, runs);
    }
  }
}

/**
 * Function toCodeTokens
 *
 * @description
 * Highlights the code of a published code block into flat runs whose texts, joined, are exactly the
 * code (the snapshot contract checks it).
 *
 * @param {string} code - Text of the code block.
 * @param {CodeLanguageDto | null} language - Declared language, `null` for plain text.
 * @returns {CodeTokenDto[] | undefined} Runs in order; `undefined` for plain text or an empty block,
 * which the page shows as text.
 */
export function toCodeTokens(
  code: string,
  language: CodeLanguageDto | null,
): CodeTokenDto[] | undefined {
  if (language === null || code === '') return undefined;
  const runs: CodeRun[] = [];
  collect(lowlight.highlight(CODE_BLOCK_LANGUAGES[language], code).children, null, runs);
  return runs.map((run: CodeRun): CodeTokenDto => ({ text: run.text, kind: run.kind }));
}

/**
 * Function toPublicCodeBlock
 *
 * @description
 * Publishes a code block with its language, its text nodes and, for a listed language, the runs
 * highlighting its code.
 *
 * @param {ArticleCodeBlock} block - Code block of the published document.
 * @returns {PublicCodeBlockDto} Public code block.
 */
export function toPublicCodeBlock(block: ArticleCodeBlock): PublicCodeBlockDto {
  const { attrs, content } = block;
  const code: string = (content ?? [])
    .map((node: { readonly text: string }): string => node.text)
    .join('');
  const tokens: CodeTokenDto[] | undefined = toCodeTokens(code, attrs.language);
  return {
    type: 'codeBlock',
    attrs: { language: attrs.language },
    ...(content === undefined ? {} : { content }),
    ...(tokens === undefined ? {} : { tokens }),
  };
}
