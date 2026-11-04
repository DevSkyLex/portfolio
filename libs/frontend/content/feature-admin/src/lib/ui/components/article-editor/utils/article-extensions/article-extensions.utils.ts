import {
  type AnyExtension,
  type Attribute,
  type Extensions,
  type Mark,
  type Node,
  getExtensionField,
  mergeAttributes,
} from '@tiptap/core';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import type { DOMOutputSpec, Node as ProseMirrorNode } from '@tiptap/pm/model';
import { StarterKit } from '@tiptap/starter-kit';
import { ARTICLE_TYPOGRAPHY } from '@vfortin/content-web-ui';
import { ArticleLists } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/constants/article-lists.constants';
import { ARTICLE_LOWLIGHT } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/constants/article-lowlight.constants';
import { FigureNode } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/constants/figure-node.constants';
import { isArticleHref } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/utils/article-href/article-href.utils';

/**
 * Constant EXTENDED
 *
 * @description
 * StarterKit extensions replaced by their article variant.
 */
const EXTENDED: ReadonlySet<string> = new Set<string>([
  'heading',
  'listItem',
  'blockquote',
  'link',
]);

/**
 * Function starterKit
 *
 * @description
 * Direct extensions of StarterKit configured for the article (D40), so that some can be extended: the
 * nodes come from `@tiptap/starter-kit`, read the way TipTap flattens an extension (`addExtensions`);
 * their own sub-extensions stay with them, so an extended one does not register them twice. No
 * strike, underline nor trailing node, and no plain code block (`articleExtensions` adds the
 * highlighted one); headings of levels 2 and 3;
 * `https`/`mailto` links typed URLs turn into, never followed on click while editing; the public article
 * classes on each node.
 *
 * @returns {AnyExtension[]} The configured StarterKit extensions.
 */
function starterKit(): AnyExtension[] {
  const kit: AnyExtension = StarterKit.configure({
    heading: { levels: [2, 3] },
    strike: false,
    underline: false,
    trailingNode: false,
    link: {
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: 'https',
      isAllowedUri: (url: string): boolean => isArticleHref(url),
      HTMLAttributes: { class: ARTICLE_TYPOGRAPHY.link, target: null, rel: null },
    },
    paragraph: { HTMLAttributes: { class: ARTICLE_TYPOGRAPHY.paragraph } },
    bold: { HTMLAttributes: { class: ARTICLE_TYPOGRAPHY.bold } },
    italic: { HTMLAttributes: { class: ARTICLE_TYPOGRAPHY.italic } },
    code: { HTMLAttributes: { class: ARTICLE_TYPOGRAPHY.inlineCode } },
    codeBlock: false,
    blockquote: { HTMLAttributes: { class: ARTICLE_TYPOGRAPHY.blockquote } },
    bulletList: { HTMLAttributes: { class: ARTICLE_TYPOGRAPHY.bulletList } },
    orderedList: { HTMLAttributes: { class: ARTICLE_TYPOGRAPHY.orderedList } },
    horizontalRule: { HTMLAttributes: { class: ARTICLE_TYPOGRAPHY.horizontalRule } },
    dropcursor: { class: 'text-accent', width: 2 },
  });
  const children: (() => AnyExtension[]) | undefined = getExtensionField<() => AnyExtension[]>(
    kit,
    'addExtensions',
    { name: kit.name, options: kit.options as unknown, storage: kit.storage as unknown },
  );
  return children?.() ?? [];
}

/**
 * Function articleExtensions
 *
 * @description
 * Schema and behaviour of the article editor (D40), limited to what `EditableArticleDocumentSchema`
 * accepts: the StarterKit set, headings drawn with the class of their level (level 2 by default, never
 * the unsupported level 1), list items and quotes restricted to paragraphs and lists, links keeping
 * `href` as their only attribute, lists three levels deep, the figure atom and code blocks
 * highlighted as they are typed in the language of their `language` attribute
 * (`ARTICLE_LOWLIGHT`, `null` for plain text). Every node takes the
 * class of the public article (`ARTICLE_TYPOGRAPHY`), so the editing surface is the preview.
 *
 * @returns {Extensions} A new extension list for one editor.
 */
export function articleExtensions(): Extensions {
  const kit: AnyExtension[] = starterKit();
  const base = (name: string): AnyExtension => {
    const found: AnyExtension | undefined = kit.find(
      (extension: AnyExtension): boolean => extension.name === name,
    );
    if (!found) throw new Error(`StarterKit has no ${name} extension.`);
    return found;
  };
  return [
    ...kit.filter((extension: AnyExtension): boolean => !EXTENDED.has(extension.name)),
    (base('heading') as Node).extend({
      addAttributes() {
        return { level: { default: 2, rendered: false } };
      },
      renderHTML({
        node,
        HTMLAttributes,
      }: {
        node: ProseMirrorNode;
        HTMLAttributes: Record<string, unknown>;
      }): DOMOutputSpec {
        const level: 2 | 3 = node.attrs['level'] === 3 ? 3 : 2;
        const options: { HTMLAttributes?: Record<string, unknown> } = this.options as {
          HTMLAttributes?: Record<string, unknown>;
        };
        return [
          `h${level}`,
          mergeAttributes(options.HTMLAttributes ?? {}, HTMLAttributes, {
            class: level === 2 ? ARTICLE_TYPOGRAPHY.h2 : ARTICLE_TYPOGRAPHY.h3,
          }),
          0,
        ];
      },
    }),
    (base('listItem') as Node).extend({ content: 'paragraph (bulletList | orderedList)*' }),
    (base('blockquote') as Node).extend({ content: '(paragraph | bulletList | orderedList)+' }),
    (base('link') as Mark).extend({
      addAttributes() {
        const inherited: Partial<Record<string, Attribute>> = this.parent?.() ?? {};
        return { href: inherited['href'] ?? { default: null } };
      },
    }),
    ArticleLists,
    FigureNode,
    CodeBlockLowlight.configure({
      lowlight: ARTICLE_LOWLIGHT,
      defaultLanguage: null,
      HTMLAttributes: { class: ARTICLE_TYPOGRAPHY.codeBlock },
    }),
  ];
}
