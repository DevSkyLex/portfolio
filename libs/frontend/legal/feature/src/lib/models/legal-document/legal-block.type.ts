import type { LegalFlowBlock } from '@internal/legal-web-feature/lib/models/legal-document/legal-flow-block.type';
import type { LegalInline } from '@internal/legal-web-feature/lib/models/legal-document/legal-inline.type';
import type { LegalList } from '@internal/legal-web-feature/lib/models/legal-document/legal-list.interface';
import type { LegalParagraph } from '@internal/legal-web-feature/lib/models/legal-document/legal-paragraph.interface';

/**
 * Type LegalBlock
 * @type LegalBlock
 *
 * @description
 * Block of a legal document: the article blocks of D40 without figures, which legal documents never
 * hold. Level-3 headings are `subheading` blocks; level-2 headings open a `LegalSection`.
 */
export type LegalBlock =
  | LegalParagraph
  | LegalList
  | { readonly kind: 'subheading'; readonly content: readonly LegalInline[] }
  | { readonly kind: 'blockquote'; readonly blocks: readonly LegalFlowBlock[] }
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'rule' };
