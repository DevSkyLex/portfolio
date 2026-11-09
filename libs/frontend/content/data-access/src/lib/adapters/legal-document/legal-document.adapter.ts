import type { PublicLegalDocumentDto } from '@vfortin/content-contracts';
import type {
  ArticleBlock,
  ArticleSection,
  LegalBlock,
  LegalDocument,
  LegalSection,
  ProjectArticle,
} from '@vfortin/content-web-model';
import { toArticle } from '@internal/content-web-data-access/lib/adapters/article/article.adapter';
import { CODE_LANGUAGE_LABELS } from '@internal/content-web-data-access/lib/constants/code-language-labels.constants';

/**
 * Function legalBlocks
 *
 * @description
 * Preserves Mermaid source as code on legal pages, whose renderer has no diagram block.
 *
 * @param {readonly ArticleBlock[]} blocks - Article blocks.
 *
 * @returns {LegalBlock[]} Legal blocks.
 */
function legalBlocks(blocks: readonly ArticleBlock[]): LegalBlock[] {
  return blocks.flatMap((block: ArticleBlock): LegalBlock[] => {
    if (block.kind === 'figure') return [];
    if (block.kind === 'diagram') {
      return [
        { kind: 'code', language: CODE_LANGUAGE_LABELS.mermaid, text: block.source, tokens: [] },
      ];
    }
    return [block];
  });
}

/**
 * Function toLegalDocument
 *
 * @description
 * Splits a published legal document at its level-2 headings like a project article (D40), each
 * heading opening a section of the page.
 *
 * @param {PublicLegalDocumentDto} dto - Snapshot document of the site locale.
 *
 * @returns {LegalDocument} Legal document.
 */
export function toLegalDocument(dto: PublicLegalDocumentDto): LegalDocument {
  const article: Pick<ProjectArticle, 'intro' | 'sections'> = toArticle(dto.document);
  return {
    updatedOn: dto.updatedOn,
    intro: legalBlocks(article.intro),
    sections: article.sections.map((section: ArticleSection): LegalSection => ({
      id: section.id,
      label: section.label,
      blocks: legalBlocks(section.blocks),
    })),
  };
}
