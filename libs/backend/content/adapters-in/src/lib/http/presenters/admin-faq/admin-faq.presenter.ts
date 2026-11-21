import type { AdminFaqView } from '@vfortin/content-application';
import type { AdminFaqEntryDto, AdminFaqList, FaqEntryRequest } from '@vfortin/content-contracts';
import type { FaqEntry, FaqEntryDraft } from '@vfortin/content-domain';

/**
 * Function toFaqEntryDraft
 *
 * @description
 * Maps a validated request to the domain draft; the field names are the same, so the domain reports
 * its errors under the contract paths (`question.en`, `answer.fr`).
 *
 * @param {FaqEntryRequest} body - Contract-validated entry content.
 * @returns {FaqEntryDraft} Domain draft.
 */
export function toFaqEntryDraft(body: FaqEntryRequest): FaqEntryDraft {
  return { question: body.question, answer: body.answer };
}

/**
 * Function toAdminFaqEntryDto
 *
 * @description
 * Presents an entry to the administration; a missing English text is left out, as in the request.
 *
 * @param {FaqEntry} entry - Entry to present.
 * @param {number} version - Version to publish; defaults to the entry's.
 * @returns {AdminFaqEntryDto} Administration entry.
 */
export function toAdminFaqEntryDto(
  entry: FaqEntry,
  version: number = entry.version,
): AdminFaqEntryDto {
  return {
    id: entry.id,
    position: entry.position,
    version,
    question: entry.question.toProps(),
    answer: entry.answer.toProps(),
  };
}

/**
 * Function toAdminFaqList
 *
 * @description
 * Presents the FAQ list with its version.
 *
 * @param {AdminFaqView} view - Entries and list version.
 * @returns {AdminFaqList} Administration list.
 */
export function toAdminFaqList(view: AdminFaqView): AdminFaqList {
  const member: AdminFaqEntryDto[] = view.entries.map((entry: FaqEntry): AdminFaqEntryDto =>
    toAdminFaqEntryDto(entry),
  );
  return { version: view.version, member, totalItems: member.length };
}
