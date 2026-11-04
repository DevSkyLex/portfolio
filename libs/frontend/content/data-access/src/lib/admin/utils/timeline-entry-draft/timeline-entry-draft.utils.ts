import type { TimelineEntryRequest } from '@vfortin/content-contracts';
import type { AdminTimelineEntry } from '@internal/content-web-data-access/lib/admin/models/admin-timeline-entry/admin-timeline-entry.interface';
import type { BilingualText } from '@internal/content-web-data-access/lib/admin/models/bilingual-text/bilingual-text.interface';
import type { TimelineEntryDraft } from '@internal/content-web-data-access/lib/admin/models/timeline-entry-draft/timeline-entry-draft.interface';

/**
 * Function flat
 *
 * @description
 * Turns a localized text into the form's pair, an absent English text becoming empty.
 *
 * @param {{ readonly fr: string; readonly en?: string }} value - Localized text.
 *
 * @returns {BilingualText} Form text.
 */
function flat(value: { readonly fr: string; readonly en?: string }): BilingualText {
  return { fr: value.fr, en: value.en ?? '' };
}

/**
 * Function localized
 *
 * @description
 * Trims a form text pair and leaves out an empty English text.
 *
 * @param {BilingualText} value - Form text.
 *
 * @returns {TimelineEntryRequest['title']} Request text.
 */
function localized(value: BilingualText): TimelineEntryRequest['title'] {
  const en: string = value.en.trim();
  return en === '' ? { fr: value.fr.trim() } : { fr: value.fr.trim(), en };
}

/**
 * Function emptyTimelineEntryDraft
 *
 * @description
 * Draft of a new entry: no text, no month chosen, not ongoing, no technology.
 *
 * @returns {TimelineEntryDraft} Empty draft.
 */
export function emptyTimelineEntryDraft(): TimelineEntryDraft {
  return {
    title: { fr: '', en: '' },
    place: { fr: '', en: '' },
    description: { fr: '', en: '' },
    startMonth: null,
    startYear: null,
    ongoing: false,
    endMonth: null,
    endYear: null,
    techs: [],
  };
}

/**
 * Function toTimelineEntryDraft
 *
 * @description
 * Form values of a stored entry; an ongoing entry checks « En cours » and leaves the end choices empty.
 *
 * @param {AdminTimelineEntry} entry - Stored entry.
 *
 * @returns {TimelineEntryDraft} Draft.
 */
export function toTimelineEntryDraft(entry: AdminTimelineEntry): TimelineEntryDraft {
  return {
    title: flat(entry.title),
    place: flat(entry.place),
    description: flat(entry.description),
    startMonth: entry.start.month,
    startYear: entry.start.year,
    ongoing: entry.end === null,
    endMonth: entry.end?.month ?? null,
    endYear: entry.end?.year ?? null,
    techs: [...entry.techs],
  };
}

/**
 * Function toTimelineEntryRequest
 *
 * @description
 * Request of a validated draft: trimmed texts, the end `null` while « En cours » is checked, trimmed
 * technology keys. A month the form left unchosen is sent as 0, which the API refuses (400).
 *
 * @param {TimelineEntryDraft} draft - Form values.
 *
 * @returns {TimelineEntryRequest} Creation or revision body.
 */
export function toTimelineEntryRequest(draft: TimelineEntryDraft): TimelineEntryRequest {
  return {
    title: localized(draft.title),
    place: localized(draft.place),
    description: localized(draft.description),
    start: { year: draft.startYear ?? 0, month: draft.startMonth ?? 0 },
    end: draft.ongoing ? null : { year: draft.endYear ?? 0, month: draft.endMonth ?? 0 },
    techs: draft.techs.map((tech: string): string => tech.trim()).filter(Boolean),
  };
}
