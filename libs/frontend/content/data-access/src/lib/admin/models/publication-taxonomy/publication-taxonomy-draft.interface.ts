import type { BilingualText } from '@internal/content-web-data-access/lib/admin/models/bilingual-text/bilingual-text.interface';

/** Bilingual category and tag values edited alongside an article. */
export interface PublicationTaxonomyDraft {
  category: { key: string; label: BilingualText };
  tags: { key: string; label: BilingualText }[];
}
