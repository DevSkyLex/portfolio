import type { AdminLegalDocumentDto, AdminProfileDto } from '@vfortin/content-contracts';
import type { AdminLegalDocument } from '@internal/content-web-data-access/lib/admin/models/admin-legal-document/admin-legal-document.interface';
import type { AdminProfile } from '@internal/content-web-data-access/lib/admin/models/admin-profile/admin-profile.interface';
import type { BilingualText } from '@internal/content-web-data-access/lib/admin/models/bilingual-text/bilingual-text.interface';

/**
 * Function bilingual
 *
 * @description
 * Copies a text per locale, an English text not written yet becoming empty.
 *
 * @param {{ fr: string; en?: string | undefined }} text - Transport text.
 *
 * @returns {BilingualText} Text per locale.
 */
function bilingual(text: { fr: string; en?: string | undefined }): BilingualText {
  return { fr: text.fr, en: text.en ?? '' };
}

/**
 * Function toAdminProfile
 *
 * @description
 * Projects the transport profile into an independently owned view model.
 *
 * @param {AdminProfileDto} dto - Successful API representation.
 *
 * @returns {AdminProfile} Administration profile.
 */
export function toAdminProfile(dto: AdminProfileDto): AdminProfile {
  return {
    heroIntro: bilingual(dto.heroIntro),
    aboutStatement: bilingual(dto.aboutStatement),
    aboutLead: bilingual(dto.aboutLead),
    facts: dto.facts.map(
      (fact: AdminProfileDto['facts'][number]): AdminProfile['facts'][number] => ({
        label: bilingual(fact.label),
        value: bilingual(fact.value),
      }),
    ),
    links: dto.links.map(
      (link: AdminProfileDto['links'][number]): AdminProfile['links'][number] => ({ ...link }),
    ),
    version: dto.version,
  };
}

/**
 * Function toAdminLegalDocument
 *
 * @description
 * Projects a transport legal document into a view model owning copies of both documents.
 *
 * @param {AdminLegalDocumentDto} dto - Successful API representation.
 *
 * @returns {AdminLegalDocument} Administration legal document.
 */
export function toAdminLegalDocument(dto: AdminLegalDocumentDto): AdminLegalDocument {
  return {
    kind: dto.kind,
    body: { fr: structuredClone(dto.body.fr), en: structuredClone(dto.body.en) },
    updatedAt: dto.updatedAt,
    version: dto.version,
  };
}
