/**
 * Type LegalInline
 * @type LegalInline
 *
 * @description
 * Inline content of a paragraph, as a tree: text, a line break, or marked text (bold, italic, code,
 * link) holding its own inline content. An `external` link opens an `https://` address, the others
 * are `mailto:` links.
 */
export type LegalInline =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'break' }
  | { readonly kind: 'bold' | 'italic' | 'code'; readonly content: readonly LegalInline[] }
  | {
      readonly kind: 'link';
      readonly href: string;
      readonly external: boolean;
      readonly content: readonly LegalInline[];
    };
