import type { FaqEntryRequest } from '@vfortin/content-contracts';
import type { AdminFaqEntry } from '@internal/content-web-data-access/lib/admin/models/admin-faq-entry/admin-faq-entry.interface';
import type { BilingualText } from '@internal/content-web-data-access/lib/admin/models/bilingual-text/bilingual-text.interface';
import type { FaqEntryDraft } from '@internal/content-web-data-access/lib/admin/models/faq-entry-draft/faq-entry-draft.interface';

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
 * @returns {FaqEntryRequest['question']} Request text.
 */
function localized(value: BilingualText): FaqEntryRequest['question'] {
  const en: string = value.en.trim();
  return en === '' ? { fr: value.fr.trim() } : { fr: value.fr.trim(), en };
}

/**
 * Function emptyFaqEntryDraft
 *
 * @description
 * Draft of a new question: no text in either language.
 *
 * @returns {FaqEntryDraft} Empty draft.
 */
export function emptyFaqEntryDraft(): FaqEntryDraft {
  return { question: { fr: '', en: '' }, answer: { fr: '', en: '' } };
}

/**
 * Function toFaqEntryDraft
 *
 * @description
 * Form values of a stored question.
 *
 * @param {AdminFaqEntry} entry - Stored question.
 *
 * @returns {FaqEntryDraft} Draft.
 */
export function toFaqEntryDraft(entry: AdminFaqEntry): FaqEntryDraft {
  return { question: flat(entry.question), answer: flat(entry.answer) };
}

/**
 * Function toFaqEntryRequest
 *
 * @description
 * Request of a validated draft: trimmed texts, an empty English text left out (the API refuses it
 * with `content.faq-entry-incomplete`, since a question is public at once). Line breaks inside an
 * answer are kept.
 *
 * @param {FaqEntryDraft} draft - Form values.
 *
 * @returns {FaqEntryRequest} Creation or revision body.
 */
export function toFaqEntryRequest(draft: FaqEntryDraft): FaqEntryRequest {
  return { question: localized(draft.question), answer: localized(draft.answer) };
}
