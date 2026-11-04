import type { AdminTimelineView } from '@vfortin/content-application';
import type {
  AdminTimelineEntryDto,
  AdminTimelineList,
  TimelineEntryRequest,
} from '@vfortin/content-contracts';
import type { TimelineEntry, TimelineEntryDraft } from '@vfortin/content-domain';

/**
 * Function toTimelineEntryDraft
 *
 * @description
 * Maps a validated request to the domain draft; the field names are the same, so the domain reports
 * its errors under the contract paths (`title.en`, `end`).
 *
 * @param {TimelineEntryRequest} body - Contract-validated entry content.
 * @returns {TimelineEntryDraft} Domain draft.
 */
export function toTimelineEntryDraft(body: TimelineEntryRequest): TimelineEntryDraft {
  return {
    title: body.title,
    place: body.place,
    description: body.description,
    start: body.start,
    end: body.end,
    techs: body.techs,
  };
}

/**
 * Function toAdminTimelineEntryDto
 *
 * @description
 * Presents an entry to the administration; a missing English text is left out, as in the request.
 *
 * @param {TimelineEntry} entry - Entry to present.
 * @param {number} version - Version to publish; defaults to the entry's.
 * @returns {AdminTimelineEntryDto} Administration entry.
 */
export function toAdminTimelineEntryDto(
  entry: TimelineEntry,
  version: number = entry.version,
): AdminTimelineEntryDto {
  return {
    id: entry.id,
    kind: entry.kind,
    position: entry.position,
    version,
    title: entry.title.toProps(),
    place: entry.place.toProps(),
    description: entry.description.toProps(),
    start: { year: entry.period.start.year, month: entry.period.start.month },
    end:
      entry.period.end === null
        ? null
        : { year: entry.period.end.year, month: entry.period.end.month },
    techs: [...entry.techs],
  };
}

/**
 * Function toAdminTimelineList
 *
 * @description
 * Presents a kind's list with its version.
 *
 * @param {AdminTimelineView} view - Entries and list version.
 * @returns {AdminTimelineList} Administration list.
 */
export function toAdminTimelineList(view: AdminTimelineView): AdminTimelineList {
  const member: AdminTimelineEntryDto[] = view.entries.map(
    (entry: TimelineEntry): AdminTimelineEntryDto => toAdminTimelineEntryDto(entry),
  );
  return { kind: view.kind, version: view.version, member, totalItems: member.length };
}
