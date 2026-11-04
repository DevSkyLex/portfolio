import type {
  AdminTimelineEntryDto,
  AdminTimelineList as AdminTimelineListDto,
} from '@vfortin/content-contracts';
import type { AdminTimelineEntry } from '@internal/content-web-data-access/lib/admin/models/admin-timeline-entry/admin-timeline-entry.interface';
import type { AdminTimelineList } from '@internal/content-web-data-access/lib/admin/models/admin-timeline-list/admin-timeline-list.interface';

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
 * Function toAdminTimelineEntry
 *
 * @description
 * Maps an administration entry DTO to its view model.
 *
 * @param {AdminTimelineEntryDto} dto - Entry received from the API.
 *
 * @returns {AdminTimelineEntry} View model.
 */
export function toAdminTimelineEntry(dto: AdminTimelineEntryDto): AdminTimelineEntry {
  return {
    id: dto.id,
    kind: dto.kind,
    position: dto.position,
    version: dto.version,
    title: text(dto.title),
    place: text(dto.place),
    description: text(dto.description),
    start: { year: dto.start.year, month: dto.start.month },
    end: dto.end === null ? null : { year: dto.end.year, month: dto.end.month },
    techs: [...dto.techs],
  };
}

/**
 * Function toAdminTimelineList
 *
 * @description
 * Maps a list DTO to its view model, keeping the list version and the order by position.
 *
 * @param {AdminTimelineListDto} dto - List received from the API.
 *
 * @returns {AdminTimelineList} View model.
 */
export function toAdminTimelineList(dto: AdminTimelineListDto): AdminTimelineList {
  return {
    kind: dto.kind,
    version: dto.version,
    entries: dto.member
      .map(toAdminTimelineEntry)
      .sort((a: AdminTimelineEntry, b: AdminTimelineEntry): number => a.position - b.position),
  };
}
