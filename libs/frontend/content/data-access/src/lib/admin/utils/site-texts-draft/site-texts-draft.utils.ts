import type {
  LegalDocumentRevisionRequest,
  ProfileRevisionRequest,
} from '@vfortin/content-contracts';
import type { AdminProfile } from '@internal/content-web-data-access/lib/admin/models/admin-profile/admin-profile.interface';
import type { ArticleDocumentDraft } from '@internal/content-web-data-access/lib/admin/models/article-document/article-document-draft.interface';
import type { BilingualText } from '@internal/content-web-data-access/lib/admin/models/bilingual-text/bilingual-text.interface';
import type { ProfileDraft } from '@internal/content-web-data-access/lib/admin/models/profile-draft/profile-draft.interface';
import { withoutFigureSources } from '@internal/content-web-data-access/lib/admin/utils/article-document/article-document.utils';

/**
 * Function requestText
 *
 * @description
 * Trims a text per locale for the request, leaving out an empty English text (the service then
 * answers `content.profile-incomplete` on its path).
 *
 * @param {BilingualText} text - Form text.
 *
 * @returns {{ fr: string; en?: string }} Request text.
 */
function requestText(text: BilingualText): { fr: string; en?: string } {
  const en: string = text.en.trim();
  return en === '' ? { fr: text.fr.trim() } : { fr: text.fr.trim(), en };
}

/**
 * Function toProfileDraft
 *
 * @description
 * Copies the loaded profile into the form's values: an e-mail link shows its address without
 * `mailto:`, a link without label gets an empty one.
 *
 * @param {AdminProfile} profile - Loaded profile.
 *
 * @returns {ProfileDraft} Form values.
 */
export function toProfileDraft(profile: AdminProfile): ProfileDraft {
  return {
    heroIntro: { ...profile.heroIntro },
    aboutStatement: { ...profile.aboutStatement },
    aboutLead: { ...profile.aboutLead },
    facts: profile.facts.map(
      (fact: AdminProfile['facts'][number]): ProfileDraft['facts'][number] => ({
        label: { ...fact.label },
        value: { ...fact.value },
      }),
    ),
    links: profile.links.map(
      (link: AdminProfile['links'][number]): ProfileDraft['links'][number] => ({
        kind: link.kind,
        url: link.kind === 'email' ? link.url.replace(/^mailto:/, '') : link.url,
        label: link.label ?? '',
      }),
    ),
  };
}

/**
 * Function toProfileRevisionRequest
 *
 * @description
 * Converts the form's values into the revision request, trimming every text; an e-mail address
 * takes its `mailto:` back and a blank link label becomes `null` (the kind's default name).
 *
 * @param {ProfileDraft} draft - Form values.
 *
 * @returns {ProfileRevisionRequest} Request body.
 */
export function toProfileRevisionRequest(draft: ProfileDraft): ProfileRevisionRequest {
  return {
    heroIntro: requestText(draft.heroIntro),
    aboutStatement: requestText(draft.aboutStatement),
    aboutLead: requestText(draft.aboutLead),
    facts: draft.facts.map(
      (fact: ProfileDraft['facts'][number]): ProfileRevisionRequest['facts'][number] => ({
        label: requestText(fact.label),
        value: requestText(fact.value),
      }),
    ),
    links: draft.links.map(
      (link: ProfileDraft['links'][number]): ProfileRevisionRequest['links'][number] => {
        const label: string = link.label.trim();
        const url: string = link.url.trim();
        return {
          kind: link.kind,
          url: link.kind === 'email' && !url.startsWith('mailto:') ? `mailto:${url}` : url,
          label: label === '' ? null : label,
        };
      },
    ),
  };
}

/**
 * Function toLegalDocumentRevisionRequest
 *
 * @description
 * Converts both edited documents into the revision request.
 *
 * @param {Readonly<{ fr: ArticleDocumentDraft; en: ArticleDocumentDraft }>} body - Edited documents.
 *
 * @returns {LegalDocumentRevisionRequest} Request body.
 */
export function toLegalDocumentRevisionRequest(
  body: Readonly<{ fr: ArticleDocumentDraft; en: ArticleDocumentDraft }>,
): LegalDocumentRevisionRequest {
  return { body: { fr: withoutFigureSources(body.fr), en: withoutFigureSources(body.en) } };
}
