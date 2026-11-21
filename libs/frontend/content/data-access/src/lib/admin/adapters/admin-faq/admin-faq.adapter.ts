import type { AdminFaqEntryDto, AdminFaqList as AdminFaqListDto } from '@vfortin/content-contracts';
import type { AdminFaqEntry } from '@internal/content-web-data-access/lib/admin/models/admin-faq-entry/admin-faq-entry.interface';
import type { AdminFaqList } from '@internal/content-web-data-access/lib/admin/models/admin-faq-list/admin-faq-list.interface';

/**
 * Function text
 *
 * @description
 * Copies a localized text, leaving out an absent English one.
 *
 * @param {{ fr: string; en?: string }} value - Localized text of the DTO.
 *
 * @returns {{ readonly fr: string; readonly en?: string }} View text.
 */
function text(value: { fr: string; en?: string | undefined }): {
  readonly fr: string;
  readonly en?: string;
} {
  return value.en === undefined ? { fr: value.fr } : { fr: value.fr, en: value.en };
}

/**
 * Function toAdminFaqEntry
 *
 * @description
 * Maps an administration FAQ entry DTO to its view model.
 *
 * @param {AdminFaqEntryDto} dto - Entry received from the API.
 *
 * @returns {AdminFaqEntry} View model.
 */
export function toAdminFaqEntry(dto: AdminFaqEntryDto): AdminFaqEntry {
  return {
    id: dto.id,
    position: dto.position,
    version: dto.version,
    question: text(dto.question),
    answer: text(dto.answer),
  };
}

/**
 * Function toAdminFaqList
 *
 * @description
 * Maps a list DTO to its view model, keeping the list version and the order by position.
 *
 * @param {AdminFaqListDto} dto - List received from the API.
 *
 * @returns {AdminFaqList} View model.
 */
export function toAdminFaqList(dto: AdminFaqListDto): AdminFaqList {
  return {
    version: dto.version,
    entries: dto.member
      .map(toAdminFaqEntry)
      .sort((a: AdminFaqEntry, b: AdminFaqEntry): number => a.position - b.position),
  };
}
