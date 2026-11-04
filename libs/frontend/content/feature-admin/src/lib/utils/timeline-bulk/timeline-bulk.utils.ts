import type { TimelineKindTexts } from '@internal/content-web-feature-admin/lib/models/timeline-kind-texts/timeline-kind-texts.interface';

/**
 * Function timelineSingular
 *
 * @description
 * Whether a count takes the singular in the admin's language: 0 and 1 in French, 1 only in English
 * (`Intl.PluralRules`, `one` category).
 *
 * @param {number} count - Count.
 * @param {string} locale - Build locale (`LOCALE_ID`).
 *
 * @returns {boolean} Whether the singular message applies.
 */
export function timelineSingular(count: number, locale: string): boolean {
  return new Intl.PluralRules(locale).select(count) === 'one';
}

/**
 * Function timelineCount
 *
 * @description
 * Count of entries of a kind with its noun (« 1 formation », « 2 expériences », « 0 expérience » in
 * French).
 *
 * @param {TimelineKindTexts} texts - Copy of the kind.
 * @param {number} count - Number of entries.
 * @param {string} locale - Build locale (`LOCALE_ID`).
 *
 * @returns {string} Count with its noun.
 */
export function timelineCount(texts: TimelineKindTexts, count: number, locale: string): string {
  return `${count} ${timelineSingular(count, locale) ? texts.one : texts.many}`;
}

/**
 * Function timelineDeleted
 *
 * @description
 * Count of a bulk deletion toast, the French participle agreeing with the count and with both feminine
 * nouns (« 1 formation supprimée », « 2 expériences supprimées »).
 *
 * @param {TimelineKindTexts} texts - Copy of the kind.
 * @param {number} count - Entries deleted.
 * @param {string} locale - Build locale (`LOCALE_ID`).
 *
 * @returns {string} Sentence without its final period.
 */
export function timelineDeleted(texts: TimelineKindTexts, count: number, locale: string): string {
  const counted: string = timelineCount(texts, count, locale);
  return timelineSingular(count, locale)
    ? $localize`:@@admin.timeline.toast.deletedCount.one:${counted}:count: supprimée`
    : $localize`:@@admin.timeline.toast.deletedCount.other:${counted}:count: supprimées`;
}

/**
 * Function timelineFailures
 *
 * @description
 * Number of failed deletions opening a bulk toast's description (« 1 échec », « 2 échecs »).
 *
 * @param {number} count - Failed deletions, at least one.
 * @param {string} locale - Build locale (`LOCALE_ID`).
 *
 * @returns {string} Count with its noun.
 */
export function timelineFailures(count: number, locale: string): string {
  return timelineSingular(count, locale)
    ? $localize`:@@admin.timeline.toast.failures.one:${count}:count: échec`
    : $localize`:@@admin.timeline.toast.failures.other:${count}:count: échecs`;
}

/**
 * Function timelineSelected
 *
 * @description
 * Count of the selection bar, agreeing in French with both feminine nouns (« 1 sélectionnée »,
 * « 2 sélectionnées »).
 *
 * @param {number} count - Checked entries.
 * @param {string} locale - Build locale (`LOCALE_ID`).
 *
 * @returns {string} Count label.
 */
export function timelineSelected(count: number, locale: string): string {
  return timelineSingular(count, locale)
    ? $localize`:@@admin.timeline.selection.count.one:${count}:count: sélectionnée`
    : $localize`:@@admin.timeline.selection.count.other:${count}:count: sélectionnées`;
}
