import type { LegalList } from '@internal/legal-web-feature/lib/models/legal-document/legal-list.interface';
import type { LegalParagraph } from '@internal/legal-web-feature/lib/models/legal-document/legal-paragraph.interface';

/**
 * Type LegalFlowBlock
 * @type LegalFlowBlock
 *
 * @description
 * Block allowed inside a list item or a quotation.
 */
export type LegalFlowBlock = LegalParagraph | LegalList;
