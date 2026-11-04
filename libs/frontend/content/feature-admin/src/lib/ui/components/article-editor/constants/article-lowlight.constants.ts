import { CODE_LANGUAGE_LABELS } from '@vfortin/content-web-data-access/admin';
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
import type { CodeLanguage } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/code-language.type';

/**
 * Constant lowlight
 *
 * @description
 * Highlighter of the grammars the service highlights with (the snapshot presenter's `SCOPE_KINDS`),
 * registered by name; `html` resolves through the `xml` grammar's alias.
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
 * Type HighlightRoot
 *
 * @description
 * Highlighted tree lowlight returns (hast).
 */
type HighlightRoot = ReturnType<ReturnType<typeof createLowlight>['highlight']>;

/**
 * Type HighlightNode
 *
 * @description
 * Node of a highlighted tree: a text leaf or a `span` whose classes spell a scope.
 */
type HighlightNode = HighlightRoot['children'][number];

/**
 * Constant COLOURED_SCOPES
 *
 * @description
 * Scopes with a token kind, the keys of the service's `SCOPE_KINDS` (code-tokens presenter) whose
 * colours the editing surface draws; `subst` is the one reset to plain text.
 */
const COLOURED_SCOPES: ReadonlySet<string> = new Set<string>([
  'keyword',
  'doctag',
  'section',
  'template-tag',
  'variable.language',
  'string',
  'regexp',
  'char',
  'code',
  'link',
  'number',
  'literal',
  'symbol',
  'variable.constant',
  'comment',
  'quote',
  'title',
  'function',
  'title.class',
  'class',
  'type',
  'built_in',
  'variable',
  'template-variable',
  'property',
  'operator',
  'punctuation',
  'bullet',
  'tag',
  'name',
  'selector-tag',
  'attr',
  'attribute',
  'selector-id',
  'selector-class',
  'selector-attr',
  'selector-pseudo',
  'meta',
]);

/**
 * Function scopeClasses
 *
 * @description
 * Classes deciding the colour of the text inside an element, matched like the service's scope kinds
 * on the longest dotted prefix (`hljs-title function_ invoke__` reads `title.function`, then
 * `title`): the element's classes for a coloured scope, none for `subst`, `undefined` for a scope
 * without a kind (`params`) or an embedded language, which keeps its parent's.
 *
 * @param {unknown} className - Classes of the element.
 *
 * @returns {readonly string[] | undefined} Classes, or `undefined` to inherit.
 */
function scopeClasses(className: unknown): readonly string[] | undefined {
  const names: string[] = Array.isArray(className)
    ? className.filter((name: unknown): name is string => typeof name === 'string')
    : [];
  const [first, ...rest] = names;
  if (!first?.startsWith('hljs-')) return undefined;
  const segments: string[] = [
    first.slice('hljs-'.length),
    ...rest.map((name: string): string => name.replace(/_+$/, '')),
  ];
  for (let length: number = segments.length; length > 0; length--) {
    const scope: string = segments.slice(0, length).join('.');
    if (scope === 'subst') return [];
    if (COLOURED_SCOPES.has(scope)) return names;
  }
  return undefined;
}

/**
 * Function flatten
 *
 * @description
 * Rewrites a highlighted tree as one level of runs, each text in a span of the classes of its
 * innermost coloured scope, or bare. The extension joins the classes of nested spans on one
 * decoration (`hljs-string hljs-subst`, `hljs-tag hljs-name`), where the outer scope's rule could win;
 * flattened, the editor colours each text as the service does for the public page.
 *
 * @param {HighlightRoot} root - Highlighted tree.
 *
 * @returns {HighlightRoot} Flat tree.
 */
function flatten(root: HighlightRoot): HighlightRoot {
  const runs: HighlightNode[] = [];
  const walk = (nodes: readonly HighlightNode[], classes: readonly string[]): void => {
    for (const node of nodes) {
      if (node.type === 'text') {
        if (node.value === '') continue;
        runs.push(
          classes.length === 0
            ? { type: 'text', value: node.value }
            : {
                type: 'element',
                tagName: 'span',
                properties: { className: [...classes] },
                children: [{ type: 'text', value: node.value }],
              },
        );
      } else if (node.type === 'element') {
        walk(node.children, scopeClasses(node.properties['className']) ?? classes);
      }
    }
  };
  walk(root.children, []);
  return { ...root, children: runs };
}

/**
 * Function isCodeLanguage
 *
 * @description
 * Whether a code block attribute names a language of the contract's list.
 *
 * @param {unknown} name - Value of `codeBlock.attrs.language`.
 *
 * @returns {boolean} `true` for a listed language.
 */
export function isCodeLanguage(name: unknown): name is CodeLanguage {
  return typeof name === 'string' && Object.hasOwn(CODE_LANGUAGE_LABELS, name);
}

/**
 * Constant ARTICLE_LOWLIGHT
 *
 * @description
 * Highlighter given to the editor's code blocks. It knows only the listed languages, so a block
 * pasted with another name or an alias (`ts`) stays plain until the service normalizes it on save,
 * like its picker shows it; it never guesses: a plain text block (`language: null`), for which the
 * extension asks `highlightAuto`, gets no colours; and its trees are flat (`flatten`).
 */
export const ARTICLE_LOWLIGHT: Pick<
  ReturnType<typeof createLowlight>,
  'highlight' | 'highlightAuto' | 'listLanguages' | 'registered'
> = {
  highlight: (language: string, value: string): HighlightRoot =>
    flatten(lowlight.highlight(language, value)),
  highlightAuto: (
    value: string,
  ): ReturnType<ReturnType<typeof createLowlight>['highlightAuto']> => ({
    type: 'root',
    children: [{ type: 'text', value }],
    data: { language: undefined, relevance: 0 },
  }),
  listLanguages: (): string[] => Object.keys(CODE_LANGUAGE_LABELS),
  registered: (name: string): boolean => isCodeLanguage(name),
};
